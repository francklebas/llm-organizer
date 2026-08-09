import { db } from '../dexie'
import { generateId } from '../../utils/uuid'
import { enqueueMutation } from './mutation'
import type { Folder } from '../../domain/types'

export interface CreateFolderInput {
  workspaceId: string
  parentId?: string | null
  name: string
  position?: number
}

export async function createFolder(input: CreateFolderInput): Promise<Folder> {
  const now = new Date().toISOString()
  const folder: Folder = {
    id: generateId(),
    workspaceId: input.workspaceId,
    parentId: input.parentId ?? null,
    name: input.name,
    position: input.position ?? 0,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  }

  await db.transaction('rw', db.folders, db.mutationQueue, async () => {
    await db.folders.add({ ...folder, syncStatus: 'pending', localUpdatedAt: Date.now() })
    await enqueueMutation('folder', folder.id, 'insert', { ...folder })
  })

  return folder
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const updatedAt = new Date().toISOString()

  await db.transaction('rw', db.folders, db.mutationQueue, async () => {
    await db.folders.update(id, {
      name,
      updatedAt,
      syncStatus: 'pending',
      localUpdatedAt: Date.now(),
    })
    await enqueueMutation('folder', id, 'update', { name, updatedAt })
  })
}

export async function moveFolder(
  id: string,
  parentId: string | null,
  position: number,
): Promise<void> {
  const updatedAt = new Date().toISOString()

  await db.transaction('rw', db.folders, db.mutationQueue, async () => {
    await db.folders.update(id, {
      parentId,
      position,
      updatedAt,
      syncStatus: 'pending',
      localUpdatedAt: Date.now(),
    })
    await enqueueMutation('folder', id, 'update', { parentId, position, updatedAt })
  })
}

export async function softDeleteFolder(id: string): Promise<void> {
  const now = new Date().toISOString()

  await db.transaction('rw', db.folders, db.mutationQueue, async () => {
    await db.folders.update(id, {
      deletedAt: now,
      updatedAt: now,
      syncStatus: 'pending',
      localUpdatedAt: Date.now(),
    })
    await enqueueMutation('folder', id, 'delete', { deletedAt: now, updatedAt: now })
  })
}

export function listFoldersByWorkspace(workspaceId: string): Promise<Folder[]> {
  return db.folders
    .where('workspaceId')
    .equals(workspaceId)
    .filter((folder) => folder.deletedAt === null)
    .toArray()
}
