import type { ConversationProvider } from '../core/types'

const CONVERSATION_PATH = /^\/c\/([0-9a-f-]{36})$/i

export const chatgptAdapter: ConversationProvider = {
  id: 'chatgpt',
  version: 1,

  matches(url) {
    return url.hostname === 'chatgpt.com' || url.hostname === 'chat.openai.com'
  },

  // URL-only: a route match is all that's needed, so a ChatGPT redesign that keeps
  // `/c/<id>` intact never breaks identification, organization, or sync.
  identify(url) {
    const externalId = CONVERSATION_PATH.exec(url.pathname)?.[1]
    if (!externalId) return null
    return { externalId, url: url.toString() }
  },

  /**
   * Best-effort only. ChatGPT exposes no stable public API for the active conversation title,
   * so this reads the DOM as a last resort and falls back to `document.title`, then to `null`
   * — it never throws, and a broken selector here must never affect `identify`.
   */
  getTitle(document) {
    const activeLink = document.querySelector('nav a[data-active="true"]')
    const linkText = activeLink?.textContent?.trim()
    if (linkText) return linkText

    const docTitle = document.title.replace(/\s*[-–]\s*ChatGPT\s*$/i, '').trim()
    return docTitle || null
  },
}
