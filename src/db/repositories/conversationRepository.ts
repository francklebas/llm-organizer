import { db } from '../dexie'
import { generateId } from '../../utils/uuid'
import { enqueueMutation } from './mutation'
import type { Conversation, Provider } from '../../domain/types'

export interface DetectedConversation {
  workspaceId: string
  provider: Provider
  externalId: string
  url: string
  title?: string
}

/** Idempotent upsert used by the background script when a provider detects a conversation. */
export async function upsertDetectedConversation(
  detected: DetectedConversation,
): Promise<Conversation> {
  const now = new Date().toISOString()

  return db.transaction('rw', db.conversations, db.mutationQueue, async () => {
    const existing = await db.conversations
      .where('[workspaceId+provider+externalId]')
      .equals([detected.workspaceId, detected.provider, detected.externalId])
      .first()

    if (existing) {
      const changes = {
        url: detected.url,
        title: detected.title ?? existing.title,
        updatedAt: now,
        lastSeenAt: now,
      }
      await db.conversations.update(existing.id, {
        ...changes,
        syncStatus: 'pending' as const,
        localUpdatedAt: Date.now(),
      })
      await enqueueMutation('conversation', existing.id, 'update', changes)
      return { ...existing, ...changes }
    }

    const conversation: Conversation = {
      id: generateId(),
      workspaceId: detected.workspaceId,
      folderId: null,
      provider: detected.provider,
      externalId: detected.externalId,
      url: detected.url,
      title: detected.title ?? null,
      position: 0,
      isFavorite: false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
    }
    await db.conversations.add({
      ...conversation,
      syncStatus: 'pending',
      localUpdatedAt: Date.now(),
    })
    await enqueueMutation('conversation', conversation.id, 'insert', { ...conversation })
    return conversation
  })
}

export async function moveConversation(id: string, folderId: string | null): Promise<void> {
  const updatedAt = new Date().toISOString()

  await db.transaction('rw', db.conversations, db.mutationQueue, async () => {
    await db.conversations.update(id, {
      folderId,
      updatedAt,
      syncStatus: 'pending',
      localUpdatedAt: Date.now(),
    })
    await enqueueMutation('conversation', id, 'update', { folderId, updatedAt })
  })
}

export async function setFavorite(id: string, isFavorite: boolean): Promise<void> {
  const updatedAt = new Date().toISOString()

  await db.transaction('rw', db.conversations, db.mutationQueue, async () => {
    await db.conversations.update(id, {
      isFavorite,
      updatedAt,
      syncStatus: 'pending',
      localUpdatedAt: Date.now(),
    })
    await enqueueMutation('conversation', id, 'update', { isFavorite, updatedAt })
  })
}

export async function softDeleteConversation(id: string): Promise<void> {
  const now = new Date().toISOString()

  await db.transaction('rw', db.conversations, db.mutationQueue, async () => {
    await db.conversations.update(id, {
      deletedAt: now,
      updatedAt: now,
      syncStatus: 'pending',
      localUpdatedAt: Date.now(),
    })
    await enqueueMutation('conversation', id, 'delete', { deletedAt: now, updatedAt: now })
  })
}

export function listConversationsByWorkspace(workspaceId: string): Promise<Conversation[]> {
  return db.conversations
    .where('workspaceId')
    .equals(workspaceId)
    .filter((conversation) => conversation.deletedAt === null)
    .toArray()
}
