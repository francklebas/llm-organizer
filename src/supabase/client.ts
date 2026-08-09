import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './config'
import { createAuthStorage } from './storage'
import type { Database } from './types'

let cached: SupabaseClient<Database> | null | undefined

/**
 * Returns the Supabase client, or `null` when cloud sync isn't configured. Cached after the
 * first call. Never throws — callers (sync engine, auth UI) treat `null` as "sync disabled".
 */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (cached !== undefined) return cached

  const config = getSupabaseConfig()
  if (!config) {
    cached = null
    return cached
  }

  cached = createClient<Database>(config.url, config.publishableKey, {
    auth: {
      storage: createAuthStorage(),
      persistSession: true,
      autoRefreshToken: true,
    },
  })
  return cached
}
