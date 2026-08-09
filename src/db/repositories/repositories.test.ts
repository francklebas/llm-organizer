import { afterEach, describe, expect, it } from 'vitest'
import { db } from '../dexie'
import {
  createWorkspace,
  getOrCreateDefaultWorkspace,
  listWorkspaces,
  softDeleteWorkspace,
} from './workspaceRepository'
import { createFolder, listFoldersByWorkspace, moveFolder } from './folderRepository'
import {
  listConversationsByWorkspace,
  moveConversation,
  setFavorite,
  upsertDetectedConversation,
} from './conversationRepository'
import { addTagToConversation, createTag, listTagsForConversation } from './tagRepository'

afterEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
  })
})

describe('workspaceRepository', () => {
  it('creates a workspace, enqueues a mutation, and excludes it once soft-deleted', async () => {
    const workspace = await createWorkspace('Perso')
    expect(await listWorkspaces()).toEqual([expect.objectContaining({ id: workspace.id })])

    const queued = await db.mutationQueue.toArray()
    expect(queued).toHaveLength(1)
    expect(queued[0]).toMatchObject({ entity: 'workspace', op: 'insert', entityId: workspace.id })

    await softDeleteWorkspace(workspace.id)
    expect(await listWorkspaces()).toEqual([])
  })

  it('getOrCreateDefaultWorkspace is idempotent under concurrent calls (React StrictMode)', async () => {
    const [a, b, c] = await Promise.all([
      getOrCreateDefaultWorkspace(),
      getOrCreateDefaultWorkspace(),
      getOrCreateDefaultWorkspace(),
    ])
    expect(a.id).toBe(b.id)
    expect(b.id).toBe(c.id)
    expect(await listWorkspaces()).toHaveLength(1)
  })
})

describe('folderRepository', () => {
  it('supports nested folders and moving between parents', async () => {
    const workspace = await createWorkspace('Dev')
    const parent = await createFolder({ workspaceId: workspace.id, name: 'Projects' })
    const child = await createFolder({
      workspaceId: workspace.id,
      parentId: parent.id,
      name: 'CV Generator',
    })

    let folders = await listFoldersByWorkspace(workspace.id)
    expect(folders).toHaveLength(2)

    await moveFolder(child.id, null, 1)
    folders = await listFoldersByWorkspace(workspace.id)
    const movedChild = folders.find((f) => f.id === child.id)
    expect(movedChild?.parentId).toBeNull()
  })
})

describe('conversationRepository', () => {
  it('upserts idempotently on workspaceId+provider+externalId', async () => {
    const workspace = await createWorkspace('Research')

    const first = await upsertDetectedConversation({
      workspaceId: workspace.id,
      provider: 'chatgpt',
      externalId: 'abc-123',
      url: 'https://chatgpt.com/c/abc-123',
      title: 'Sociology notes',
    })

    const second = await upsertDetectedConversation({
      workspaceId: workspace.id,
      provider: 'chatgpt',
      externalId: 'abc-123',
      url: 'https://chatgpt.com/c/abc-123',
      title: 'Sociology notes (renamed)',
    })

    expect(second.id).toBe(first.id)
    const all = await listConversationsByWorkspace(workspace.id)
    expect(all).toHaveLength(1)
    expect(all[0]?.title).toBe('Sociology notes (renamed)')
  })

  it('moves a conversation into a folder and toggles favorite', async () => {
    const workspace = await createWorkspace('Research')
    const folder = await createFolder({ workspaceId: workspace.id, name: 'Philosophy' })
    const conversation = await upsertDetectedConversation({
      workspaceId: workspace.id,
      provider: 'claude',
      externalId: 'xyz-789',
      url: 'https://claude.ai/chat/xyz-789',
    })

    await moveConversation(conversation.id, folder.id)
    await setFavorite(conversation.id, true)

    const [updated] = await listConversationsByWorkspace(workspace.id)
    expect(updated?.folderId).toBe(folder.id)
    expect(updated?.isFavorite).toBe(true)
  })
})

describe('tagRepository', () => {
  it('attaches a tag to a conversation', async () => {
    const workspace = await createWorkspace('Research')
    const tag = await createTag(workspace.id, 'sociology')
    const conversation = await upsertDetectedConversation({
      workspaceId: workspace.id,
      provider: 'gemini',
      externalId: 'g-1',
      url: 'https://gemini.google.com/app/g-1',
    })

    await addTagToConversation(conversation.id, tag.id)
    const links = await listTagsForConversation(conversation.id)
    expect(links).toEqual([
      expect.objectContaining({ conversationId: conversation.id, tagId: tag.id }),
    ])
  })
})
