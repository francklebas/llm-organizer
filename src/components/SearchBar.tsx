import { useUiStore } from '../stores/uiStore'

export function SearchBar() {
  const view = useUiStore((state) => state.view)
  const setSearch = useUiStore((state) => state.setSearch)
  const query = view.type === 'search' ? view.query : ''

  return (
    <input
      className="search-bar"
      type="search"
      placeholder="🔎 Search..."
      value={query}
      onChange={(event) => setSearch(event.target.value)}
    />
  )
}
