import type { ConversationProvider } from '../providers/core/types'
import type { ConversationDetectedMessage } from '../background/messages'

/**
 * Wires a provider adapter's `identify`/`getTitle` into the page: detects SPA navigation and
 * reports newly identified conversations to the background script. Shared across provider
 * content scripts — the SPA-watching mechanics are identical, only the adapter differs.
 */
export function watchProvider(adapter: ConversationProvider): void {
  let lastReportedExternalId: string | null = null

  function safeGetTitle(): string | undefined {
    try {
      return adapter.getTitle?.(document) ?? undefined
    } catch {
      return undefined
    }
  }

  function report(): void {
    const url = new URL(window.location.href)
    const reference = adapter.identify(url, document)
    if (!reference || reference.externalId === lastReportedExternalId) return
    lastReportedExternalId = reference.externalId

    const message: ConversationDetectedMessage = {
      type: 'conversation-detected',
      provider: adapter.id,
      externalId: reference.externalId,
      url: reference.url,
      title: safeGetTitle(),
    }
    void browser.runtime.sendMessage(message)
  }

  // Most AI chat providers are SPAs: neither a page load nor a MutationObserver alone catches
  // every in-app navigation.
  const originalPushState = history.pushState.bind(history)
  history.pushState = (...args: Parameters<typeof history.pushState>) => {
    originalPushState(...args)
    report()
  }
  window.addEventListener('popstate', report)

  new MutationObserver(report).observe(document.querySelector('title') ?? document.head, {
    childList: true,
    subtree: true,
  })
  report()
}
