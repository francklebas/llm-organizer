import type { Provider } from '../../domain/types'

/**
 * The extension never owns a conversation — it only keeps a reference into the provider's own
 * history. `externalId` is the load-bearing field; everything else (title, DOM structure) is
 * secondary and allowed to be unavailable without breaking identification, organization, or sync.
 */
export interface ConversationReference {
  externalId: string
  url: string
}

export interface ConversationProvider {
  id: Provider
  /** Bumped whenever the adapter's identification logic changes — useful to diagnose which
   * adapter version created a given reference once a provider's routing changes. */
  version: number
  matches(url: URL): boolean
  /**
   * Identification priority: URL/routing first, DOM only as an absolute last resort. `document`
   * is optional and must never be required to resolve `externalId`.
   */
  identify(url: URL, document?: Document): ConversationReference | null
  /** Best-effort only — never a dependency for identification, organization, or sync. */
  getTitle?(document: Document): string | null
}
