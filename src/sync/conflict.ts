export interface Timestamped {
  updatedAt: string
}

/**
 * Pluggable conflict resolution: the MVP uses last-write-wins on `updatedAt`, which can lose
 * data on true concurrent edits across devices. This is an accepted MVP trade-off (see project
 * memory) — swap this resolver for a per-field merge or CRDT later without touching call sites.
 */
export interface ConflictResolver<T extends Timestamped> {
  resolve(local: T, remote: T): T
}

export function isNewer(a: Timestamped, b: Timestamped): boolean {
  return new Date(a.updatedAt).getTime() >= new Date(b.updatedAt).getTime()
}

export const lastWriteWins: ConflictResolver<Timestamped> = {
  resolve(local, remote) {
    return isNewer(local, remote) ? local : remote
  },
}
