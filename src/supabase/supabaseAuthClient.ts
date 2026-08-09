import type { Session as SupabaseSession, SupabaseClient } from '@supabase/supabase-js'
import type { AuthClient, Session } from './authClient'
import type { Database } from './types'

function toSession(session: SupabaseSession | null): Session | null {
  if (!session) return null
  return { userId: session.user.id, email: session.user.email ?? null }
}

export function createSupabaseAuthClient(client: SupabaseClient<Database>): AuthClient {
  return {
    async getSession() {
      const { data } = await client.auth.getSession()
      return { session: toSession(data.session) }
    },
    async signUp(email, password) {
      const { error } = await client.auth.signUp({ email, password })
      return { error }
    },
    async signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({ email, password })
      return { error }
    },
    async signOut() {
      const { error } = await client.auth.signOut()
      return { error }
    },
    onAuthStateChange(callback) {
      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((_event, session) => {
        callback(toSession(session))
      })
      return () => subscription.unsubscribe()
    },
  }
}
