import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import {
  createFolder,
  listFoldersByWorkspace,
  renameFolder,
  softDeleteFolder,
} from '../db/repositories/folderRepository'
import { useUiStore } from '../stores/uiStore'
import type { Folder } from '../domain/types'

interface FolderNodeProps {
  folder: Folder
  childrenByParent: Map<string | null, Folder[]>
  depth: number
}

function FolderNode({ folder, childrenByParent, depth }: FolderNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const [draftName, setDraftName] = useState(folder.name)
  const view = useUiStore((state) => state.view)
  const setFolder = useUiStore((state) => state.setFolder)
  const children = childrenByParent.get(folder.id) ?? []
  const isSelected = view.type === 'folder' && view.folderId === folder.id

  function commitRename() {
    setRenaming(false)
    const trimmed = draftName.trim()
    if (trimmed && trimmed !== folder.name) void renameFolder(folder.id, trimmed)
    else setDraftName(folder.name)
  }

  return (
    <li>
      <div
        className={`folder-row${isSelected ? ' folder-row--selected' : ''}`}
        style={{ paddingLeft: depth * 12 }}
      >
        {children.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-label={expanded ? 'Réduire' : 'Développer'}
          >
            {expanded ? '▾' : '▸'}
          </button>
        )}
        {renaming ? (
          <input
            value={draftName}
            autoFocus
            onChange={(event) => setDraftName(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitRename()
              if (event.key === 'Escape') {
                setDraftName(folder.name)
                setRenaming(false)
              }
            }}
          />
        ) : (
          <button type="button" onClick={() => setFolder(folder.id)}>
            {folder.name}
          </button>
        )}
        <button type="button" onClick={() => setRenaming(true)} aria-label="Renommer">
          ✎
        </button>
        <button
          type="button"
          aria-label="Sous-dossier"
          onClick={() =>
            void createFolder({
              workspaceId: folder.workspaceId,
              parentId: folder.id,
              name: 'Nouveau dossier',
            })
          }
        >
          +
        </button>
        <button
          type="button"
          aria-label="Supprimer"
          onClick={() => {
            if (window.confirm(`Supprimer "${folder.name}" ?`)) void softDeleteFolder(folder.id)
          }}
        >
          🗑
        </button>
      </div>
      {expanded && children.length > 0 && (
        <ul>
          {children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              childrenByParent={childrenByParent}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export function FolderTree({ workspaceId }: { workspaceId: string }) {
  const folders = useLiveQuery(() => listFoldersByWorkspace(workspaceId), [workspaceId]) ?? []
  const view = useUiStore((state) => state.view)
  const setFolder = useUiStore((state) => state.setFolder)

  const childrenByParent = new Map<string | null, Folder[]>()
  for (const folder of folders) {
    const list = childrenByParent.get(folder.parentId) ?? []
    list.push(folder)
    childrenByParent.set(folder.parentId, list)
  }
  const roots = childrenByParent.get(null) ?? []

  return (
    <nav className="folder-tree">
      <div className="folder-tree__header">
        <span>Workspace</span>
        <button
          type="button"
          onClick={() => void createFolder({ workspaceId, name: 'Nouveau dossier' })}
        >
          + Dossier
        </button>
      </div>
      <ul>
        <li>
          <div
            className={`folder-row${view.type === 'folder' && view.folderId === null ? ' folder-row--selected' : ''}`}
          >
            <button type="button" onClick={() => setFolder(null)}>
              Toutes les conversations
            </button>
          </div>
        </li>
        {roots.map((folder) => (
          <FolderNode
            key={folder.id}
            folder={folder}
            childrenByParent={childrenByParent}
            depth={1}
          />
        ))}
      </ul>
    </nav>
  )
}
