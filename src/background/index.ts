import { upsertDetectedConversation } from '../db/repositories/conversationRepository'
import { getOrCreateDefaultWorkspace } from '../db/repositories/workspaceRepository'
import { isConversationDetectedMessage, type ConversationDetectedMessage } from './messages'

async function handleConversationDetected(message: ConversationDetectedMessage): Promise<void> {
  const workspace = await getOrCreateDefaultWorkspace()
  await upsertDetectedConversation({
    workspaceId: workspace.id,
    provider: message.provider,
    externalId: message.externalId,
    url: message.url,
    title: message.title,
  })
}

browser.runtime.onMessage.addListener((message: unknown) => {
  if (!isConversationDetectedMessage(message)) return undefined
  return handleConversationDetected(message)
})
