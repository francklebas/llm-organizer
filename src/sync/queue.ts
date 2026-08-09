import { db } from '../db/dexie'
import type { QueuedMutation } from '../db/schema'

const BASE_DELAY_MS = 2_000
const MAX_DELAY_MS = 5 * 60 * 1_000

/** Exponential backoff capped at 5 minutes, so a flaky connection doesn't hammer Supabase. */
export function backoffDelay(attempts: number): number {
  return Math.min(BASE_DELAY_MS * 2 ** attempts, MAX_DELAY_MS)
}

/** Claims mutations that are due for a retry and marks them in-flight so a concurrent sync cycle skips them. */
export async function claimDueMutations(limit = 50): Promise<QueuedMutation[]> {
  const now = Date.now()
  const due = await db.mutationQueue
    .where('status')
    .equals('pending')
    .filter((mutation) => mutation.nextRetryAt <= now)
    .sortBy('createdAt')

  const batch = due.slice(0, limit)
  await Promise.all(
    batch.map((mutation) => db.mutationQueue.update(mutation.localId, { status: 'inflight' })),
  )
  return batch.map((mutation) => ({ ...mutation, status: 'inflight' }))
}

export async function markMutationSynced(localId: number): Promise<void> {
  await db.mutationQueue.delete(localId)
}

const MAX_ATTEMPTS = 8

export async function markMutationFailed(localId: number, attempts: number): Promise<void> {
  if (attempts >= MAX_ATTEMPTS) {
    await db.mutationQueue.update(localId, { status: 'failed', attempts })
    return
  }
  await db.mutationQueue.update(localId, {
    status: 'pending',
    attempts,
    nextRetryAt: Date.now() + backoffDelay(attempts),
  })
}
