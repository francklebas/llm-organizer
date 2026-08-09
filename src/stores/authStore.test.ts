import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from './authStore'
import type { AuthClient, Session } from '../supabase/authClient'

afterEach(async () => {
  await useAuthStore.getState().initialize(null)
})

function createMockAuthClient(overrides: Partial<AuthClient> = {}): AuthClient {
  return {
    getSession: vi.fn().mockResolvedValue({ session: null }),
    signUp: vi.fn().mockResolvedValue({ error: null }),
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue(() => {}),
    ...overrides,
  }
}

describe('useAuthStore', () => {
  it('is "unconfigured" when initialized without a client (Supabase not set up)', async () => {
    await useAuthStore.getState().initialize(null)
    expect(useAuthStore.getState().status).toBe('unconfigured')
  })

  it('restores an existing session on initialize', async () => {
    const session: Session = { userId: 'u1', email: 'franck@example.com' }
    const client = createMockAuthClient({ getSession: vi.fn().mockResolvedValue({ session }) })

    await useAuthStore.getState().initialize(client)

    expect(useAuthStore.getState()).toMatchObject({ status: 'signed-in', session })
  })

  it('is "signed-out" when configured but no session exists yet', async () => {
    const client = createMockAuthClient()
    await useAuthStore.getState().initialize(client)
    expect(useAuthStore.getState().status).toBe('signed-out')
  })

  it('surfaces a sign-in error without touching the session', async () => {
    const client = createMockAuthClient({
      signIn: vi.fn().mockResolvedValue({ error: new Error('Invalid credentials') }),
    })
    await useAuthStore.getState().initialize(client)

    await useAuthStore.getState().signIn('franck@example.com', 'wrong-password')

    expect(useAuthStore.getState()).toMatchObject({ status: 'signed-out', error: 'Invalid credentials' })
  })

  it('clears the session on sign-out', async () => {
    const session: Session = { userId: 'u1', email: 'franck@example.com' }
    const client = createMockAuthClient({ getSession: vi.fn().mockResolvedValue({ session }) })
    await useAuthStore.getState().initialize(client)

    await useAuthStore.getState().signOut()

    expect(useAuthStore.getState()).toMatchObject({ status: 'signed-out', session: null })
  })

  it('does nothing when a mutation is attempted while unconfigured', async () => {
    await useAuthStore.getState().initialize(null)
    await useAuthStore.getState().signIn('a@b.com', 'password')
    expect(useAuthStore.getState().status).toBe('unconfigured')
  })
})
