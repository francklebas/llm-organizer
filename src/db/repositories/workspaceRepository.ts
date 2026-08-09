import { db } from '../dexie'
import { generateId } from '../../utils/uuid'
import { enqueueMutation } from './mutation'
import type { Workspace } from '../../domain/types'

export async function createWorkspace(name: string): Promise<Workspace> {
  const now = new Date().toISOString()
  const workspace: Workspace = {
    id: generateId(),
    name,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  }

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
// Fixed id (not a random UUID) so "get or create" is idempotent under concurrent calls —
// e.g. React StrictMode double-invoking the mount effect that calls this. With a random id,
// two racing calls could each see "no workspace yet" and create two, and which one a later
// call picks up (`listWorkspaces()[0]`, ordered by key, not by creation time) would be
// arbitrary — silently orphaning folders/conversations created under the other one.
const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001'

/** The extension works fully offline/without an account, so a local workspace always exists. */
export async function getOrCreateDefaultWorkspace(): Promise<Workspace> {
  const existing = await db.workspaces.get(DEFAULT_WORKSPACE_ID)
  if (existing && existing.deletedAt === null) return existing

  const now = new Date().toISOString()
  const workspace: Workspace = {
    id: DEFAULT_WORKSPACE_ID,
    name: DEFAULT_WORKSPACE_NAME,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  }

  try {
    await db.transaction('rw', db.workspaces, db.mutationQueue, async () => {
      await db.workspaces.add({ ...workspace, syncStatus: 'pending', localUpdatedAt: Date.now() })
      await enqueueMutation('workspace', workspace.id, 'insert', { ...workspace })
    })
    return workspace
  } catch {
    // Lost the race to a concurrent call that created it first — that's the authoritative row.
    const created = await db.workspaces.get(DEFAULT_WORKSPACE_ID)
    if (created) return created
    throw new Error('Failed to get or create the default workspace')
  }
}
