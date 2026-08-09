import { create } from 'zustand'
import type { AuthClient, Session } from '../supabase/authClient'

export type AuthStatus = 'unconfigured' | 'loading' | 'signed-out' | 'signed-in'

interface AuthState {
  client: AuthClient | null
  status: AuthStatus
  session: Session | null
  error: string | null
  /** Call once at startup with the real client, or `null` when cloud sync isn't configured. */
  initialize: (client: AuthClient | null) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  client: null,
  status: 'loading',
  session: null,
  error: null,

  async initialize(client) {
    if (!client) {
      set({ client: null, status: 'unconfigured', session: null, error: null })
      return
    }

    const { session } = await client.getSession()
    set({ client, status: session ? 'signed-in' : 'signed-out', session, error: null })
    client.onAuthStateChange((next) => {
      set({ status: next ? 'signed-in' : 'signed-out', session: next })
    })
  },

  async signUp(email, password) {
    const { client } = get()
    if (!client) return
    set({ error: null })
    const { error } = await client.signUp(email, password)
    if (error) set({ error: error.message })
  },

  async signIn(email, password) {
    const { client } = get()
    if (!client) return
    set({ error: null })
    const { error } = await client.signIn(email, password)
    if (error) set({ error: error.message })
  },

  async signOut() {
    const { client } = get()
    if (!client) return
    await client.signOut()
    set({ status: 'signed-out', session: null })
  },
}))
