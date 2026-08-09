import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/dexie'
import { createWorkspace, renameWorkspace } from '../db/repositories/workspaceRepository'
import { createTag } from '../db/repositories/tagRepository'
import { addTagToConversation } from '../db/repositories/tagRepository'
import { upsertDetectedConversation } from '../db/repositories/conversationRepository'
import { pullRemoteChanges, pushPendingMutations } from './engine'
import type { SyncClient } from './syncClient'

afterEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
  })
  vi.useRealTimers()
})

function createMockClient(overrides: Partial<SyncClient> = {}): SyncClient {
  return {
    upsert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockResolvedValue({ error: null }),
    deleteRow: vi.fn().mockResolvedValue({ error: null }),
    selectUpdatedSince: vi.fn().mockResolvedValue({ data: [], error: null }),
    ...overrides,
  }
}

describe('pushPendingMutations', () => {
  it('does nothing when offline (no client)', async () => {
    await createWorkspace('Offline test')
    await expect(pushPendingMutations(null)).resolves.toBeUndefined()
    expect(await db.mutationQueue.count()).toBe(1)
  })

  it('pushes an insert as an upsert and clears the queue on success', async () => {
    const workspace = await createWorkspace('Projects')
    const client = createMockClient()

    await pushPendingMutations(client)

    expect(client.upsert).toHaveBeenCalledWith(
      'workspaces',
      expect.arrayContaining([expect.objectContaining({ id: workspace.id, name: 'Projects' })]),
    )
    expect(await db.mutationQueue.count()).toBe(0)
    const stored = await db.workspaces.get(workspace.id)
    expect(stored?.syncStatus).toBe('synced')
  })

  it('pushes an update via a targeted patch, not a full upsert', async () => {
    const workspace = await createWorkspace('Projects')
    const client = createMockClient()
    await pushPendingMutations(client) // flush the insert first

    await renameWorkspace(workspace.id, 'Renamed')
    await pushPendingMutations(client)

    expect(client.update).toHaveBeenCalledWith(
      'workspaces',
      workspace.id,
      expect.objectContaining({ name: 'Renamed' }),
    )
  })

  it('hard-deletes conversation_tags remotely instead of upserting', async () => {
    const workspace = await createWorkspace('Projects')
    const tag = await createTag(workspace.id, 'react')
    const conversation = await upsertDetectedConversation({
      workspaceId: workspace.id,
      provider: 'chatgpt',
      externalId: 'c-1',
      url: 'https://chatgpt.com/c/c-1',
    })
    const client = createMockClient()
    await pushPendingMutations(client) // flush workspace/tag/conversation inserts

    await addTagToConversation(conversation.id, tag.id)
    await pushPendingMutations(client)

    expect(client.upsert).toHaveBeenCalledWith(
      'conversation_tags',
      expect.arrayContaining([
        expect.objectContaining({ conversation_id: conversation.id, tag_id: tag.id }),
      ]),
    )
  })

  it('reschedules a failed mutation with backoff instead of dropping it', async () => {
    await createWorkspace('Projects')
    const client = createMockClient({
      upsert: vi.fn().mockResolvedValue({ error: new Error('network down') }),
    })

    await pushPendingMutations(client)

    const [mutation] = await db.mutationQueue.toArray()
    expect(mutation).toMatchObject({ status: 'pending', attempts: 1 })
    expect(mutation!.nextRetryAt).toBeGreaterThan(Date.now())
  })
})

describe('pullRemoteChanges', () => {
  it('does nothing when offline (no client)', async () => {
    await expect(pullRemoteChanges(null)).resolves.toBeUndefined()
  })

  it('applies a remote row that has no local counterpart', async () => {
    const client = createMockClient({
      selectUpdatedSince: vi.fn().mockImplementation((table: string) => {
        if (table !== 'workspaces') return Promise.resolve({ data: [], error: null })
        return Promise.resolve({
          data: [
            {
              id: 'remote-1',
              name: 'From another device',
              deleted_at: null,
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-01T00:00:00.000Z',
            },
          ],
          error: null,
        })
      }),
    })

    await pullRemoteChanges(client)

    const stored = await db.workspaces.get('remote-1')
    expect(stored).toMatchObject({ name: 'From another device', syncStatus: 'synced' })
  })

  it('keeps the local pending edit when it is newer than the remote row (last-write-wins)', async () => {
    const workspace = await createWorkspace('Original')
    await renameWorkspace(workspace.id, 'Local newer edit')

    const client = createMockClient({
      selectUpdatedSince: vi.fn().mockImplementation((table: string) => {
        if (table !== 'workspaces') return Promise.resolve({ data: [], error: null })
        return Promise.resolve({
          data: [
            {
              id: workspace.id,
              name: 'Stale remote edit',
              deleted_at: null,
              created_at: workspace.createdAt,
              updated_at: '2020-01-01T00:00:00.000Z',
            },
          ],
          error: null,
        })
      }),
    })

    await pullRemoteChanges(client)

    const stored = await db.workspaces.get(workspace.id)
    expect(stored?.name).toBe('Local newer edit')
  })

  it('accepts the remote row when it is newer than the local one', async () => {
    const workspace = await createWorkspace('Original')
    await db.workspaces.update(workspace.id, { syncStatus: 'synced' })

    const client = createMockClient({
      selectUpdatedSince: vi.fn().mockImplementation((table: string) => {
        if (table !== 'workspaces') return Promise.resolve({ data: [], error: null })
        return Promise.resolve({
          data: [
            {
              id: workspace.id,
              name: 'Renamed on another device',
              deleted_at: null,
              created_at: workspace.createdAt,
              updated_at: '2099-01-01T00:00:00.000Z',
            },
          ],
          error: null,
        })
      }),
    })

    await pullRemoteChanges(client)

    const stored = await db.workspaces.get(workspace.id)
    expect(stored?.name).toBe('Renamed on another device')
  })
})
