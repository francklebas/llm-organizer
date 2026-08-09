import { chatgptAdapter } from '../chatgpt/adapter'
import type { ConversationProvider } from './types'

// Claude and Gemini adapters (providers/claude, providers/gemini) plug in here once implemented.
// MVP is ChatGPT-only by design — see providers/claude/adapter.ts for why they're not wired yet.
const providers: ConversationProvider[] = [chatgptAdapter]

export function findProviderForUrl(url: URL): ConversationProvider | undefined {
  return providers.find((provider) => provider.matches(url))
}

export type { ConversationProvider, ConversationReference } from './types'
