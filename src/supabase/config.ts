export interface SupabaseConfig {
  url: string
  publishableKey: string
}

/** Returns null when Supabase env vars are unset — cloud sync is an opt-in feature. */
export function getSupabaseConfig(): SupabaseConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !publishableKey) return null
  return { url, publishableKey }
}
