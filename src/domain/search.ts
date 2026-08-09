export interface SearchableConversation {
  title: string | null
  provider: string
}

/** Local search over title, provider, folder name, and tags — no semantic/vector search for the MVP. */
export function matchesSearch(
  conversation: SearchableConversation,
  folderName: string | undefined,
  tagNames: string[],
  query: string,
): boolean {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return true

  const haystack = [conversation.title ?? '', conversation.provider, folderName ?? '', ...tagNames]
    .join(' ')
    .toLowerCase()
  return haystack.includes(trimmed)
}
