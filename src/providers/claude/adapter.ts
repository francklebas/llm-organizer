import type { ConversationProvider } from '../core/types'

/**
 * Placeholder only — intentionally not implemented for the ChatGPT-only MVP. Adding Claude
 * support later is scoped entirely to filling in `identify`/`getTitle` here and registering
 * this adapter in `providers/core/registry.ts`; nothing else in the app changes.
 */
export const claudeAdapter: ConversationProvider = {
  id: 'claude',
  version: 0,

  matches(url) {
    return url.hostname === 'claude.ai'
  },

  identify() {
    return null
  },
}
