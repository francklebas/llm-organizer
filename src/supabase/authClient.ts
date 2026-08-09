export interface Session {
  userId: string
  email: string | null
}

/**
 * Thin abstraction over Supabase Auth, mirroring `SyncClient`: keeps the auth store testable
 * with a mock instead of a live Supabase project.
 */
export interface AuthClient {
  getSession: () => Promise<{ session: Session | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<{ error: Error | null }>
  onAuthStateChange: (callback: (session: Session | null) => void) => () => void
}
