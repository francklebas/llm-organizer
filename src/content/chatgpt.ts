import { chatgptAdapter } from '../providers/chatgpt/adapter'
import type { ConversationDetectedMessage } from '../background/messages'

let lastReportedExternalId: string | null = null

/** Title is best-effort: a thrown or missing selector must never block identification. */
function safeGetTitle(): string | undefined {
  try {
    return chatgptAdapter.getTitle?.(document) ?? undefined
  } catch {
    return undefined
  }
}

function report(): void {
  const url = new URL(window.location.href)
  const reference = chatgptAdapter.identify(url, document)
  if (!reference || reference.externalId === lastReportedExternalId) return
  lastReportedExternalId = reference.externalId

  const message: ConversationDetectedMessage = {
    type: 'conversation-detected',
    provider: chatgptAdapter.id,
    externalId: reference.externalId,
    url: reference.url,
    title: safeGetTitle(),
  }
  void browser.runtime.sendMessage(message)
}

/** ChatGPT is a SPA: neither a page load nor a MutationObserver alone catches every navigation. */
function watchNavigation(onChange: () => void): void {
  const originalPushState = history.pushState.bind(history)
  history.pushState = (...args: Parameters<typeof history.pushState>) => {
    originalPushState(...args)
    onChange()
  }
  window.addEventListener('popstate', onChange)
}

watchNavigation(report)
new MutationObserver(report).observe(document.querySelector('title') ?? document.head, {
  childList: true,
  subtree: true,
})
report()
