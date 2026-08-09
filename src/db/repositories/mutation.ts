import { db } from '../dexie'
import type { MutationEntity, MutationOp } from '../schema'

export async function enqueueMutation(
  entity: MutationEntity,
  entityId: string,
  op: MutationOp,
  payload: Record<string, unknown>,
): Promise<void> {
  const now = Date.now()
  await db.mutationQueue.add({
    entity,
    entityId,
    op,
    payload,
    status: 'pending',
    attempts: 0,
    createdAt: now,
    nextRetryAt: now,
  })
}
