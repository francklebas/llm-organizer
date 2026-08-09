import type { ConversationProvider } from '../core/types'

/**
 * Placeholder only — intentionally not implemented for the ChatGPT-only MVP. Adding Gemini
 * support later is scoped entirely to filling in `identify`/`getTitle` here and registering
 * this adapter in `providers/core/registry.ts`; nothing else in the app changes.
 */
export const geminiAdapter: ConversationProvider = {
  id: 'gemini',
  version: 0,

  matches(url) {
    return url.hostname === 'gemini.google.com'
  },

  identify() {
    return null
  },
}
