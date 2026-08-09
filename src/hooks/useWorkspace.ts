import { useEffect, useState } from 'react'
import { getOrCreateDefaultWorkspace } from '../db/repositories/workspaceRepository'
import type { Workspace } from '../domain/types'

/** The local workspace always exists — no account required. */
export function useWorkspace(): Workspace | null {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)

  useEffect(() => {
    let cancelled = false
    void getOrCreateDefaultWorkspace().then((result) => {
      if (!cancelled) setWorkspace(result)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return workspace
}
