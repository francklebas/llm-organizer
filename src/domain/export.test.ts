import { afterEach, describe, expect, it } from 'vitest'
import { db } from '../db/dexie'
import { createWorkspace } from '../db/repositories/workspaceRepository'
import { createFolder } from '../db/repositories/folderRepository'
import { upsertDetectedConversation } from '../db/repositories/conversationRepository'
import {
  addTagToConversation,
  createTag,
  listTagsForConversation,
} from '../db/repositories/tagRepository'
import { createConversationLink } from '../db/repositories/conversationLinkRepository'
import { EXPORT_FORMAT_VERSION, exportWorkspace, importWorkspaceData } from './export'

afterEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
  })
})

describe('exportWorkspace / importWorkspaceData', () => {
  it('round-trips folders, conversations, tags, and links into an empty workspace', async () => {
    const workspace = await createWorkspace('Research')
    const parent = await createFolder({ workspaceId: workspace.id, name: 'Projects' })
    const child = await createFolder({
      workspaceId: workspace.id,
      parentId: parent.id,
      name: 'CV Generator',
    })
    const tag = await createTag(workspace.id, 'ATS')
    const conversationA = await upsertDetectedConversation({
      workspaceId: workspace.id,
      provider: 'chatgpt',
      externalId: 'a',
      url: 'https://chatgpt.com/c/a',
      title: 'Architecture du matching ATS',
    })
    const conversationB = await upsertDetectedConversation({
      workspaceId: workspace.id,
      provider: 'chatgpt',
      externalId: 'b',
      url: 'https://chatgpt.com/c/b',
    })
    await addTagToConversation(conversationA.id, tag.id)
    await createFolder({ workspaceId: workspace.id, parentId: child.id, name: 'unused' })
    await createConversationLink(workspace.id, conversationA.id, conversationB.id, 'follow_up')

    const exported = await exportWorkspace(workspace.id)
    expect(exported.version).toBe(EXPORT_FORMAT_VERSION)
    expect(exported.folders).toHaveLength(3)
    expect(exported.conversations).toHaveLength(2)
    const exportedA = exported.conversations.find((c) => c.externalId === 'a')
    expect(exportedA?.tagIds).toEqual([tag.id])

    const targetWorkspace = await createWorkspace('Imported')
    await importWorkspaceData(exported, targetWorkspace.id)

    const importedFolders = await db.folders
      .where('workspaceId')
      .equals(targetWorkspace.id)
      .toArray()
    expect(importedFolders).toHaveLength(3)
    const importedChild = importedFolders.find((f) => f.name === 'CV Generator')
    const importedParent = importedFolders.find((f) => f.name === 'Projects')
    expect(importedChild?.parentId).toBe(importedParent?.id)

    const importedConversations = await db.conversations
      .where('workspaceId')
      .equals(targetWorkspace.id)
      .toArray()
    expect(importedConversations).toHaveLength(2)
    const importedA = importedConversations.find((c) => c.externalId === 'a')
    expect(importedA?.title).toBe('Architecture du matching ATS')

    const importedTags = await listTagsForConversation(importedA!.id)
    expect(importedTags).toHaveLength(1)

    const importedLinks = await db.conversationLinks
      .where('workspaceId')
      .equals(targetWorkspace.id)
      .toArray()
    expect(importedLinks).toHaveLength(1)
    expect(importedLinks[0]?.type).toBe('follow_up')

    // Original workspace's data must be untouched by the import.
    const originalConversations = await db.conversations
      .where('workspaceId')
      .equals(workspace.id)
      .toArray()
    expect(originalConversations).toHaveLength(2)
  })

  it('rejects a payload with an unsupported version', async () => {
    const workspace = await createWorkspace('Target')
    const badPayload = { version: 2 } as unknown as Parameters<typeof importWorkspaceData>[0]
    await expect(importWorkspaceData(badPayload, workspace.id)).rejects.toThrow(/version/i)
  })

  it('throws for an unknown workspace id instead of silently exporting nothing', async () => {
    await expect(exportWorkspace('does-not-exist')).rejects.toThrow(/not found/i)
  })
})
