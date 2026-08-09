export type Provider = 'chatgpt' | 'claude' | 'gemini' | 'other'

export interface Workspace {
  id: string
  name: string
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Folder {
  id: string
  workspaceId: string
  parentId: string | null
  name: string
  position: number
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Conversation {
  id: string
  workspaceId: string
  folderId: string | null
  provider: Provider
  externalId: string
  url: string
  title: string | null
  position: number
  isFavorite: boolean
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  lastSeenAt: string
}

export interface Tag {
  id: string
  workspaceId: string
  name: string
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ConversationTag {
  conversationId: string
  tagId: string
  createdAt: string
}

export type ConversationLinkType = 'related' | 'derived_from' | 'follow_up' | 'reference'

export interface ConversationLink {
  id: string
  workspaceId: string
  sourceConversationId: string
  targetConversationId: string
  type: ConversationLinkType
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}
