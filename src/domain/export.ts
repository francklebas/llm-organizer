import { db } from '../db/dexie'
import { enqueueMutation } from '../db/repositories/mutation'
import { listConversationLinksByWorkspace } from '../db/repositories/conversationLinkRepository'
import { listConversationsByWorkspace } from '../db/repositories/conversationRepository'
import { listFoldersByWorkspace } from '../db/repositories/folderRepository'
import { listTagsByWorkspace } from '../db/repositories/tagRepository'
import { generateId } from '../utils/uuid'
import type { Conversation, ConversationLink, Folder, Tag, Workspace } from './types'

export const EXPORT_FORMAT_VERSION = 1 as const

/**
 * Portable, versioned backup format — the user's guarantee that their organization survives
 * independently of Supabase. `tagIds` on each conversation is the one addition beyond the
 * documented top-level shape, needed to round-trip tag assignments.
 */
export interface WorkspaceExport {
  version: typeof EXPORT_FORMAT_VERSION
  workspace: Workspace
  folders: Folder[]
  conversations: (Conversation & { tagIds: string[] })[]
  tags: Tag[]
  links: ConversationLink[]
}

function stripSyncMeta<T extends object>(record: T): T {
  const clone = { ...record } as Record<string, unknown>
  delete clone.syncStatus
  delete clone.localUpdatedAt
  return clone as T
}

export async function exportWorkspace(workspaceId: string): Promise<WorkspaceExport> {
  const workspace = await db.workspaces.get(workspaceId)
  if (!workspace) throw new Error(`Workspace not found: ${workspaceId}`)

  const [folders, conversations, tags, links] = await Promise.all([
    listFoldersByWorkspace(workspaceId),
    listConversationsByWorkspace(workspaceId),
    listTagsByWorkspace(workspaceId),
    listConversationLinksByWorkspace(workspaceId),
  ])

  const conversationTagLinks = await db.conversationTags
    .where('conversationId')
    .anyOf(conversations.map((conversation) => conversation.id))
    .toArray()
  const tagIdsByConversation = new Map<string, string[]>()
  for (const link of conversationTagLinks) {
    const tagIds = tagIdsByConversation.get(link.conversationId) ?? []
    tagIds.push(link.tagId)
    tagIdsByConversation.set(link.conversationId, tagIds)
  }

  return {
    version: EXPORT_FORMAT_VERSION,
    workspace: stripSyncMeta(workspace),
    folders: folders.map(stripSyncMeta),
    conversations: conversations.map((conversation) => ({
      ...stripSyncMeta(conversation),
      tagIds: tagIdsByConversation.get(conversation.id) ?? [],
    })),
    tags: tags.map(stripSyncMeta),
    links: links.map(stripSyncMeta),
  }
}

/**
 * Imports into an existing (possibly non-empty) workspace. Every id is regenerated and
 * relationships (folder nesting, conversation↔folder, conversation↔tag, links) are remapped
 * accordingly, so importing the same file twice — or into a workspace that already has data —
 * never collides with or overwrites anything.
 */
export async function importWorkspaceData(
  payload: WorkspaceExport,
  targetWorkspaceId: string,
): Promise<void> {
  if (payload.version !== EXPORT_FORMAT_VERSION) {
    throw new Error(`Unsupported export version: ${String(payload.version)}`)
  }

  const folderIdMap = new Map(payload.folders.map((folder) => [folder.id, generateId()]))
  const tagIdMap = new Map(payload.tags.map((tag) => [tag.id, generateId()]))
  const conversationIdMap = new Map(
    payload.conversations.map((conversation) => [conversation.id, generateId()]),
  )
  const localUpdatedAt = Date.now()

  await db.transaction(
    'rw',
    [
      db.folders,
      db.tags,
      db.conversations,
      db.conversationTags,
      db.conversationLinks,
      db.mutationQueue,
    ],
    async () => {
      for (const folder of payload.folders) {
        const id = folderIdMap.get(folder.id)
        if (!id) continue
        const record: Folder = {
          ...folder,
          id,
          workspaceId: targetWorkspaceId,
          parentId: folder.parentId ? (folderIdMap.get(folder.parentId) ?? null) : null,
        }
        await db.folders.add({ ...record, syncStatus: 'pending', localUpdatedAt })
        await enqueueMutation('folder', id, 'insert', { ...record })
      }

      for (const tag of payload.tags) {
        const id = tagIdMap.get(tag.id)
        if (!id) continue
        const record: Tag = { ...tag, id, workspaceId: targetWorkspaceId }
        await db.tags.add({ ...record, syncStatus: 'pending', localUpdatedAt })
        await enqueueMutation('tag', id, 'insert', { ...record })
      }

      for (const { tagIds, ...conversation } of payload.conversations) {
        const id = conversationIdMap.get(conversation.id)
        if (!id) continue
        const record: Conversation = {
          ...conversation,
          id,
          workspaceId: targetWorkspaceId,
          folderId: conversation.folderId ? (folderIdMap.get(conversation.folderId) ?? null) : null,
        }
        await db.conversations.add({ ...record, syncStatus: 'pending', localUpdatedAt })
        await enqueueMutation('conversation', id, 'insert', { ...record })

        for (const oldTagId of tagIds) {
          const tagId = tagIdMap.get(oldTagId)
          if (!tagId) continue
          const createdAt = new Date().toISOString()
          await db.conversationTags.put({
            conversationId: id,
            tagId,
            createdAt,
            syncStatus: 'pending',
          })
          await enqueueMutation('conversationTag', `${id}:${tagId}`, 'insert', {
            conversationId: id,
            tagId,
            createdAt,
          })
        }
      }

      for (const link of payload.links) {
        const sourceConversationId = conversationIdMap.get(link.sourceConversationId)
        const targetConversationId = conversationIdMap.get(link.targetConversationId)
        if (!sourceConversationId || !targetConversationId) continue
        const id = generateId()
        const record: ConversationLink = {
          ...link,
          id,
          workspaceId: targetWorkspaceId,
          sourceConversationId,
          targetConversationId,
        }
        await db.conversationLinks.add({ ...record, syncStatus: 'pending', localUpdatedAt })
        await enqueueMutation('conversationLink', id, 'insert', { ...record })
      }
    },
  )
}
