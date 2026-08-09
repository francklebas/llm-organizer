import { create } from 'zustand'

export type SidebarView =
  | { type: 'folder'; folderId: string | null }
  | { type: 'favorites' }
  | { type: 'search'; query: string }

interface UiState {
  view: SidebarView
  setFolder: (folderId: string | null) => void
  setFavorites: () => void
  setSearch: (query: string) => void
}

export const useUiStore = create<UiState>((set) => ({
  view: { type: 'folder', folderId: null },
  setFolder: (folderId) => set({ view: { type: 'folder', folderId } }),
  setFavorites: () => set({ view: { type: 'favorites' } }),
  setSearch: (query) =>
    set({ view: query.trim() ? { type: 'search', query } : { type: 'folder', folderId: null } }),
}))
