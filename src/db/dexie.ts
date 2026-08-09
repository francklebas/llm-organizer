import Dexie, { type EntityTable, type Table } from 'dexie'
import type {
  LocalConversation,
  LocalConversationLink,
  LocalConversationTag,
  LocalFolder,
  LocalTag,
  LocalWorkspace,
  QueuedMutation,
} from './schema'

export class OrganizerDatabase extends Dexie {
  workspaces!: EntityTable<LocalWorkspace, 'id'>
  folders!: EntityTable<LocalFolder, 'id'>
  conversations!: EntityTable<LocalConversation, 'id'>
  tags!: EntityTable<LocalTag, 'id'>
  conversationTags!: Table<LocalConversationTag, [string, string]>
  conversationLinks!: EntityTable<LocalConversationLink, 'id'>
  mutationQueue!: EntityTable<QueuedMutation, 'localId'>
  /** Sync bookkeeping: e.g. `cursor:<entity>` -> last successfully pulled `updated_at`. */
  meta!: EntityTable<{ key: string; value: string }, 'key'>

  constructor(name = 'ai-conversation-organizer') {
    super(name)
    this.version(1).stores({
      workspaces: 'id, updatedAt, syncStatus',
      folders: 'id, workspaceId, parentId, updatedAt, syncStatus',
      conversations:
        'id, workspaceId, folderId, provider, updatedAt, syncStatus, [workspaceId+provider+externalId]',
      tags: 'id, workspaceId, name, updatedAt, syncStatus',
      conversationTags: '[conversationId+tagId], conversationId, tagId',
      conversationLinks:
        'id, workspaceId, sourceConversationId, targetConversationId, updatedAt, syncStatus',
      mutationQueue: '++localId, entity, entityId, status, createdAt',
      meta: 'key',
    })
  }
}

export const db = new OrganizerDatabase()
