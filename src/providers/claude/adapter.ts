import type { ConversationProvider } from '../core/types'

const CONVERSATION_PATH = /^\/chat\/([0-9a-f-]{36})$/i

export const claudeAdapter: ConversationProvider = {
  id: 'claude',
  version: 1,

  matches(url) {
    return url.hostname === 'claude.ai'
  },

  // URL-only: a route match is all that's needed, so a Claude redesign that keeps
  // `/chat/<id>` intact never breaks identification, organization, or sync.
  identify(url) {
    const externalId = CONVERSATION_PATH.exec(url.pathname)?.[1]
    if (!externalId) return null
    return { externalId, url: url.toString() }
  },

  /**
   * Best-effort only. Claude exposes no stable public API for the active conversation title,
   * so this reads the DOM as a last resort and falls back to `document.title`, then to `null`
   * — it never throws, and a broken selector here must never affect `identify`.
   */
  getTitle(document) {
    const activeLink = document.querySelector(
      'a[data-testid="chat-menu-trigger"], nav a[aria-current="page"]',
    )
    const linkText = activeLink?.textContent?.trim()
    if (linkText) return linkText

    const docTitle = document.title.replace(/\s*[-–]\s*Claude\s*$/i, '').trim()
    return docTitle || null
  },
}
