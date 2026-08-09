import { db } from '../dexie'
import { generateId } from '../../utils/uuid'
import { enqueueMutation } from './mutation'
import type { ConversationLink, ConversationLinkType } from '../../domain/types'

export async function createConversationLink(
  workspaceId: string,
  sourceConversationId: string,
  targetConversationId: string,
  type: ConversationLinkType = 'related',
): Promise<ConversationLink> {
  const now = new Date().toISOString()
  const link: ConversationLink = {
    id: generateId(),
    workspaceId,
    sourceConversationId,
    targetConversationId,
    type,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  }

  await db.transaction('rw', db.conversationLinks, db.mutationQueue, async () => {
    await db.conversationLinks.add({ ...link, syncStatus: 'pending', localUpdatedAt: Date.now() })
    await enqueueMutation('conversationLink', link.id, 'insert', { ...link })
  })

  return link
}

export async function softDeleteConversationLink(id: string): Promise<void> {
  const now = new Date().toISOString()

  await db.transaction('rw', db.conversationLinks, db.mutationQueue, async () => {
    await db.conversationLinks.update(id, {
      deletedAt: now,
      updatedAt: now,
      syncStatus: 'pending',
      localUpdatedAt: Date.now(),
    })
    await enqueueMutation('conversationLink', id, 'delete', { deletedAt: now, updatedAt: now })
  })
}

export function listLinksForConversation(conversationId: string): Promise<ConversationLink[]> {
  return db.conversationLinks
    .where('sourceConversationId')
    .equals(conversationId)
    .or('targetConversationId')
    .equals(conversationId)
    .filter((link) => link.deletedAt === null)
    .toArray()
}

export function listConversationLinksByWorkspace(workspaceId: string): Promise<ConversationLink[]> {
  return db.conversationLinks
    .where('workspaceId')
    .equals(workspaceId)
    .filter((link) => link.deletedAt === null)
    .toArray()
}
