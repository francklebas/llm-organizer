import { db } from '../dexie'
import { generateId } from '../../utils/uuid'
import { enqueueMutation } from './mutation'
import type { Tag } from '../../domain/types'

export async function createTag(workspaceId: string, name: string): Promise<Tag> {
  const now = new Date().toISOString()
  const tag: Tag = { id: generateId(), workspaceId, name, deletedAt: null, createdAt: now, updatedAt: now }

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
