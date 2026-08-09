import type { Provider } from '../domain/types'

export interface ConversationDetectedMessage {
  type: 'conversation-detected'
  provider: Provider
  externalId: string
  url: string
  title?: string
}

export function isConversationDetectedMessage(
  message: unknown,
): message is ConversationDetectedMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    message.type === 'conversation-detected'
  )
}
