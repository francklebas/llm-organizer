import { db } from '../dexie'
import { generateId } from '../../utils/uuid'
import { enqueueMutation } from './mutation'
import type { Workspace } from '../../domain/types'

export async function createWorkspace(name: string): Promise<Workspace> {
  const now = new Date().toISOString()
  const workspace: Workspace = { id: generateId(), name, deletedAt: null, createdAt: now, updatedAt: now }

  await db.transaction('rw', db.workspaces, db.mutationQueue, async () => {
    await db.workspaces.add({ ...workspace, syncStatus: 'pending', localUpdatedAt: Date.now() })
    await enqueueMutation('workspace', workspace.id, 'insert', { ...workspace })
  })

  return workspace
}

export async function renameWorkspace(id: string, name: string): Promise<void> {
  const updatedAt = new Date().toISOString()

  await db.transaction('rw', db.workspaces, db.mutationQueue, async () => {
    await db.workspaces.update(id, {
      name,
      updatedAt,
      syncStatus: 'pending',
      localUpdatedAt: Date.now(),
    })
    await enqueueMutation('workspace', id, 'update', { name, updatedAt })
  })
}

export async function softDeleteWorkspace(id: string): Promise<void> {
  const now = new Date().toISOString()

  await db.transaction('rw', db.workspaces, db.mutationQueue, async () => {
    await db.workspaces.update(id, {
      deletedAt: now,
      updatedAt: now,
      syncStatus: 'pending',
      localUpdatedAt: Date.now(),
    })
    await enqueueMutation('workspace', id, 'delete', { deletedAt: now, updatedAt: now })
  })
}

export function listWorkspaces(): Promise<Workspace[]> {
  return db.workspaces.filter((workspace) => workspace.deletedAt === null).toArray()
}

const DEFAULT_WORKSPACE_NAME = 'Mon espace'

/** The extension works fully offline/without an account, so a local workspace always exists. */
export async function getOrCreateDefaultWorkspace(): Promise<Workspace> {
  const [existing] = await listWorkspaces()
  if (existing) return existing
  return createWorkspace(DEFAULT_WORKSPACE_NAME)
}
