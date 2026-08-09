import { db } from '../db/dexie'
import type { MutationEntity, QueuedMutation, SyncMeta } from '../db/schema'
import type { Conversation, ConversationLink, Folder, Tag, Workspace } from '../domain/types'
import { toCamelCaseRow, toSnakeCaseRow } from '../utils/case'
import { isNewer } from './conflict'
import { claimDueMutations, markMutationFailed, markMutationSynced } from './queue'
import type { SyncClient } from './syncClient'

const ENTITY_TABLE: Record<MutationEntity, string> = {
  workspace: 'workspaces',
  folder: 'folders',
  conversation: 'conversations',
  tag: 'tags',
  conversationTag: 'conversation_tags',
  conversationLink: 'conversation_links',
}

const PULLABLE_ENTITIES = [
  'workspace',
  'folder',
  'conversation',
  'tag',
  'conversationLink',
] as const

async function pushOne(client: SyncClient, mutation: QueuedMutation): Promise<void> {
  const table = ENTITY_TABLE[mutation.entity]

  if (mutation.entity === 'conversationTag') {
    const { conversationId, tagId } = mutation.payload as { conversationId: string; tagId: string }
    const { error } =
      mutation.op === 'delete'
        ? await client.deleteRow(table, { conversation_id: conversationId, tag_id: tagId })
        : await client.upsert(table, [toSnakeCaseRow(mutation.payload)])
    if (error) throw error
    return
  }

  const { error } =
    mutation.op === 'insert'
      ? await client.upsert(table, [toSnakeCaseRow(mutation.payload)])
      : await client.update(table, mutation.entityId, toSnakeCaseRow(mutation.payload))
  if (error) throw error
}

async function markEntitySynced(entity: MutationEntity, entityId: string): Promise<void> {
  switch (entity) {
    case 'workspace':
      await db.workspaces.update(entityId, { syncStatus: 'synced' })
      return
    case 'folder':
      await db.folders.update(entityId, { syncStatus: 'synced' })
      return
    case 'conversation':
      await db.conversations.update(entityId, { syncStatus: 'synced' })
      return
    case 'tag':
      await db.tags.update(entityId, { syncStatus: 'synced' })
      return
    case 'conversationLink':
      await db.conversationLinks.update(entityId, { syncStatus: 'synced' })
      return
    case 'conversationTag': {
      const [conversationId, tagId] = entityId.split(':')
      if (conversationId && tagId) {
        await db.conversationTags.update([conversationId, tagId], { syncStatus: 'synced' })
      }
    }
  }
}

/**
 * Drains due mutations and pushes them to Supabase. Never throws: a failed mutation is
 * rescheduled with backoff via `markMutationFailed`, so a flaky network never blocks local
 * writes or crashes the caller (background alarm / manual sync trigger).
 */
export async function pushPendingMutations(client: SyncClient | null): Promise<void> {
  if (!client) return

  const batch = await claimDueMutations()
  for (const mutation of batch) {
    try {
      await pushOne(client, mutation)
      await markMutationSynced(mutation.localId!)
      await markEntitySynced(mutation.entity, mutation.entityId)
    } catch {
      await markMutationFailed(mutation.localId!, mutation.attempts + 1)
    }
  }
}

async function getCursor(entity: MutationEntity): Promise<string> {
  const row = await db.meta.get(`cursor:${entity}`)
  return row?.value ?? '1970-01-01T00:00:00.000Z'
}

async function setCursor(entity: MutationEntity, cursor: string): Promise<void> {
  await db.meta.put({ key: `cursor:${entity}`, value: cursor })
}

async function upsertIfNewer<T extends { id: string; updatedAt: string }>(
  table: {
    get(id: string): Promise<(T & SyncMeta) | undefined>
    put(row: T & SyncMeta): Promise<unknown>
  },
  remote: T,
): Promise<void> {
  const local = await table.get(remote.id)
  if (local && local.syncStatus !== 'synced' && isNewer(local, remote)) return
  await table.put({ ...remote, syncStatus: 'synced', localUpdatedAt: Date.now() })
}

async function mergeRemoteRow(
  entity: (typeof PULLABLE_ENTITIES)[number],
  row: Record<string, unknown>,
) {
  const camel = toCamelCaseRow(row)
  switch (entity) {
    case 'workspace':
      return upsertIfNewer(db.workspaces, camel as unknown as Workspace)
    case 'folder':
      return upsertIfNewer(db.folders, camel as unknown as Folder)
    case 'conversation':
      return upsertIfNewer(db.conversations, camel as unknown as Conversation)
    case 'tag':
      return upsertIfNewer(db.tags, camel as unknown as Tag)
    case 'conversationLink':
      return upsertIfNewer(db.conversationLinks, camel as unknown as ConversationLink)
  }
}

async function pullEntity(
  client: SyncClient,
  entity: (typeof PULLABLE_ENTITIES)[number],
): Promise<void> {
  const table = ENTITY_TABLE[entity]
  const cursor = await getCursor(entity)
  const { data, error } = await client.selectUpdatedSince(table, 'updated_at', cursor)
  if (error || !data || data.length === 0) return

  for (const row of data) {
    await mergeRemoteRow(entity, row)
  }

  const latest = data.reduce<string>((max, row) => {
    const updatedAt = row.updated_at as string
    return updatedAt > max ? updatedAt : max
  }, cursor)
  await setCursor(entity, latest)
}

/** Incremental pull by cursor: only rows changed since the last successful pull are fetched. */
export async function pullRemoteChanges(client: SyncClient | null): Promise<void> {
  if (!client) return
  for (const entity of PULLABLE_ENTITIES) {
    await pullEntity(client, entity)
  }
}

export async function runSyncCycle(client: SyncClient | null): Promise<void> {
  await pushPendingMutations(client)
  await pullRemoteChanges(client)
}
