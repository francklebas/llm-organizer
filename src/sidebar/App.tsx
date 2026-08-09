import { AuthPanel } from '../components/AuthPanel'
import { ConversationList } from '../components/ConversationList'
import { ExportImportPanel } from '../components/ExportImportPanel'
import { FolderTree } from '../components/FolderTree'
import { SearchBar } from '../components/SearchBar'
import { useWorkspace } from '../hooks/useWorkspace'
import { useUiStore } from '../stores/uiStore'

export default function App() {
  const workspace = useWorkspace()
  const view = useUiStore((state) => state.view)
  const setFavorites = useUiStore((state) => state.setFavorites)
  const setFolder = useUiStore((state) => state.setFolder)

  if (!workspace) {
    return <div className="sidebar-root">Chargement…</div>
  }

  return (
    <div className="sidebar-root">
      <h1>AI Organizer</h1>
      <SearchBar />
      <FolderTree workspaceId={workspace.id} />
      <div className="sidebar-shortcuts">
        <button
          type="button"
          className={view.type === 'favorites' ? 'folder-row--selected' : ''}
          onClick={setFavorites}
        >
          ★ Favorites
        </button>
        <button type="button" onClick={() => setFolder(null)}>
          Toutes les conversations
        </button>
      </div>
      <ConversationList workspaceId={workspace.id} />
      <ExportImportPanel workspaceId={workspace.id} />
      <AuthPanel />
    </div>
  )
}
