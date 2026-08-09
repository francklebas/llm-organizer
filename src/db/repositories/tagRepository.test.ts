import { afterEach, describe, expect, it } from 'vitest'
import { db } from '../dexie'
import { createWorkspace } from './workspaceRepository'
import { upsertDetectedConversation } from './conversationRepository'
import { addTagToConversation, createTag, listConversationTagNames } from './tagRepository'

afterEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
  })
})

describe('listConversationTagNames', () => {
  it('batches tag names per conversation for search', async () => {
    const workspace = await createWorkspace('Research')
    const sociology = await createTag(workspace.id, 'sociology')
    const philosophy = await createTag(workspace.id, 'philosophy')
    const conversationA = await upsertDetectedConversation({
      workspaceId: workspace.id,
      provider: 'chatgpt',
      externalId: 'a',
      url: 'https://chatgpt.com/c/a',
    })
    const conversationB = await upsertDetectedConversation({
      workspaceId: workspace.id,
      provider: 'chatgpt',
      externalId: 'b',
      url: 'https://chatgpt.com/c/b',
    })
    await addTagToConversation(conversationA.id, sociology.id)
    await addTagToConversation(conversationA.id, philosophy.id)
    await addTagToConversation(conversationB.id, philosophy.id)

    const result = await listConversationTagNames([conversationA.id, conversationB.id])

    expect(new Set(result.get(conversationA.id))).toEqual(new Set(['sociology', 'philosophy']))
    expect(result.get(conversationB.id)).toEqual(['philosophy'])
  })

  it('returns an empty map for an empty input', async () => {
    expect(await listConversationTagNames([])).toEqual(new Map())
  })
})
