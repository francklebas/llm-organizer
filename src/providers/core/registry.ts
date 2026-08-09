import { chatgptAdapter } from '../chatgpt/adapter'
import { claudeAdapter } from '../claude/adapter'
import type { ConversationProvider } from './types'

// Gemini adapter (providers/gemini) plugs in here once implemented — still a placeholder.
const providers: ConversationProvider[] = [chatgptAdapter, claudeAdapter]

export function findProviderForUrl(url: URL): ConversationProvider | undefined {
  return providers.find((provider) => provider.matches(url))
}

export type { ConversationProvider, ConversationReference } from './types'
