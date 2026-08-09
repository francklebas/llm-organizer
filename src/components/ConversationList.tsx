import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import {
  listConversationsByWorkspace,
  moveConversation,
  setFavorite,
} from '../db/repositories/conversationRepository'
import { listFoldersByWorkspace } from '../db/repositories/folderRepository'
import {
  addTagToConversation,
  createTag,
  listConversationTagNames,
  listTagsByWorkspace,
  listTagsForConversation,
  removeTagFromConversation,
} from '../db/repositories/tagRepository'
import { matchesSearch } from '../domain/search'
import { useUiStore } from '../stores/uiStore'
import type { Conversation, Folder, Tag } from '../domain/types'

interface ConversationRowProps {
  conversation: Conversation
  folders: Folder[]
  tags: Tag[]
}

function ConversationRow({ conversation, folders, tags }: ConversationRowProps) {
  const conversationTags =
    useLiveQuery(() => listTagsForConversation(conversation.id), [conversation.id]) ?? []
  const [newTag, setNewTag] = useState('')
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]))

  async function submitTag() {
    const name = newTag.trim()
    if (!name) return
    const existing = tags.find((tag) => tag.name === name)
    const tag = existing ?? (await createTag(conversation.workspaceId, name))
    await addTagToConversation(conversation.id, tag.id)
    setNewTag('')
  }

  return (
    <li className="conversation-row">
      <button
        type="button"
        onClick={() => void setFavorite(conversation.id, !conversation.isFavorite)}
        aria-label="Favori"
      >
        {conversation.isFavorite ? '★' : '☆'}
      </button>
      <a href={conversation.url} target="_blank" rel="noreferrer">
        {conversation.title ?? conversation.externalId}
      </a>
      <span className="conversation-row__provider">{conversation.provider}</span>
      <select
        value={conversation.folderId ?? ''}
        onChange={(event) => void moveConversation(conversation.id, event.target.value || null)}
      >
        <option value="">(sans dossier)</option>
        {folders.map((folder) => (
          <option key={folder.id} value={folder.id}>
            {folder.name}
          </option>
        ))}
      </select>
      <span className="conversation-row__tags">
        {conversationTags.map((link) => {
          const tag = tagsById.get(link.tagId)
          if (!tag) return null
          return (
            <span key={link.tagId} className="tag-chip">
              {tag.name}
              <button
                type="button"
                aria-label="Retirer le tag"
                onClick={() => void removeTagFromConversation(conversation.id, link.tagId)}
              >
                ×
              </button>
            </span>
          )
        })}
        <input
          className="tag-input"
          placeholder="+ tag"
          value={newTag}
          onChange={(event) => setNewTag(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void submitTag()
          }}
        />
      </span>
    </li>
  )
}

export function ConversationList({ workspaceId }: { workspaceId: string }) {
  const view = useUiStore((state) => state.view)
  const conversations =
    useLiveQuery(() => listConversationsByWorkspace(workspaceId), [workspaceId]) ?? []
  const folders = useLiveQuery(() => listFoldersByWorkspace(workspaceId), [workspaceId]) ?? []
  const tags = useLiveQuery(() => listTagsByWorkspace(workspaceId), [workspaceId]) ?? []
  const conversationIds = conversations.map((conversation) => conversation.id)
  const tagNamesByConversation =
    useLiveQuery(() => listConversationTagNames(conversationIds), [conversationIds.join(',')]) ??
    new Map<string, string[]>()
  const foldersById = new Map(folders.map((folder) => [folder.id, folder]))

  let visible: Conversation[]
  if (view.type === 'favorites') {
    visible = conversations.filter((conversation) => conversation.isFavorite)
  } else if (view.type === 'search') {
    visible = conversations.filter((conversation) =>
      matchesSearch(
        conversation,
        foldersById.get(conversation.folderId ?? '')?.name,
        tagNamesByConversation.get(conversation.id) ?? [],
        view.query,
      ),
    )
  } else if (view.folderId) {
    visible = conversations.filter((conversation) => conversation.folderId === view.folderId)
  } else {
    visible = conversations
  }

  return (
    <ul className="conversation-list">
      {visible.map((conversation) => (
        <ConversationRow
          key={conversation.id}
          conversation={conversation}
          folders={folders}
          tags={tags}
        />
      ))}
      {visible.length === 0 && <li className="conversation-list__empty">Aucune conversation.</li>}
    </ul>
  )
}
