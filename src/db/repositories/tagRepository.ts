import { db } from '../dexie'
import { generateId } from '../../utils/uuid'
import { enqueueMutation } from './mutation'
import type { Tag } from '../../domain/types'

export async function createTag(workspaceId: string, name: string): Promise<Tag> {
  const now = new Date().toISOString()
  const tag: Tag = {
    id: generateId(),
    workspaceId,
    name,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  }

  await db.transaction('rw', db.tags, db.mutationQueue, async () => {
    await db.tags.add({ ...tag, syncStatus: 'pending', localUpdatedAt: Date.now() })
    await enqueueMutation('tag', tag.id, 'insert', { ...tag })
  })

  return tag
}

export async function softDeleteTag(id: string): Promise<void> {
  const now = new Date().toISOString()

  await db.transaction('rw', db.tags, db.mutationQueue, async () => {
    await db.tags.update(id, {
      deletedAt: now,
      updatedAt: now,
      syncStatus: 'pending',
      localUpdatedAt: Date.now(),
    })
    await enqueueMutation('tag', id, 'delete', { deletedAt: now, updatedAt: now })
  })
}

export function listTagsByWorkspace(workspaceId: string): Promise<Tag[]> {
  return db.tags
    .where('workspaceId')
    .equals(workspaceId)
    .filter((tag) => tag.deletedAt === null)
    .toArray()
}

export async function addTagToConversation(conversationId: string, tagId: string): Promise<void> {
  const createdAt = new Date().toISOString()

  await db.transaction('rw', db.conversationTags, db.mutationQueue, async () => {
    await db.conversationTags.put({ conversationId, tagId, createdAt, syncStatus: 'pending' })
    await enqueueMutation('conversationTag', `${conversationId}:${tagId}`, 'insert', {
      conversationId,
      tagId,
      createdAt,
    })
  })
}

export async function removeTagFromConversation(
  conversationId: string,
  tagId: string,
): Promise<void> {
  await db.transaction('rw', db.conversationTags, db.mutationQueue, async () => {
    await db.conversationTags.delete([conversationId, tagId])
    await enqueueMutation('conversationTag', `${conversationId}:${tagId}`, 'delete', {
      conversationId,
      tagId,
    })
  })
}

export function listTagsForConversation(conversationId: string) {
  return db.conversationTags.where('conversationId').equals(conversationId).toArray()
}

/** Tag names per conversation, for local search — one batched read instead of N+1 per row. */
export async function listConversationTagNames(
  conversationIds: string[],
): Promise<Map<string, string[]>> {
  if (conversationIds.length === 0) return new Map()

  const [links, tags] = await Promise.all([
    db.conversationTags.where('conversationId').anyOf(conversationIds).toArray(),
    db.tags.toArray(),
  ])
  const nameById = new Map(tags.map((tag) => [tag.id, tag.name]))

  const result = new Map<string, string[]>()
  for (const link of links) {
    const name = nameById.get(link.tagId)
    if (!name) continue
    const names = result.get(link.conversationId) ?? []
    names.push(name)
    result.set(link.conversationId, names)
  }
  return result
}
