import type {
  Conversation,
  ConversationLink,
  ConversationTag,
  Folder,
  Tag,
  Workspace,
} from '../domain/types'

/** Local sync bookkeeping merged onto every syncable entity row. */
export interface SyncMeta {
  syncStatus: 'synced' | 'pending' | 'conflict'
  localUpdatedAt: number
}

export type LocalWorkspace = Workspace & SyncMeta
export type LocalFolder = Folder & SyncMeta
export type LocalConversation = Conversation & SyncMeta
export type LocalTag = Tag & SyncMeta
export type LocalConversationTag = ConversationTag & { syncStatus: SyncMeta['syncStatus'] }
export type LocalConversationLink = ConversationLink & SyncMeta

export type MutationEntity =
  | 'workspace'
  | 'folder'
  | 'conversation'
  | 'tag'
  | 'conversationTag'
  | 'conversationLink'

export type MutationOp = 'insert' | 'update' | 'delete'

export interface QueuedMutation {
  localId?: number
  entity: MutationEntity
  entityId: string
  op: MutationOp
  payload: Record<string, unknown>
  status: 'pending' | 'inflight' | 'failed'
  attempts: number
  createdAt: number
  nextRetryAt: number
}
