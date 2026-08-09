export interface AsyncStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

/** Persists the Supabase auth session via the extension's storage API. */
function createBrowserStorage(): AsyncStorage {
  return {
    async getItem(key) {
      const result: Record<string, unknown> = await browser.storage.local.get(key)
      const value = result[key]
      return typeof value === 'string' ? value : null
    },
    async setItem(key, value) {
      await browser.storage.local.set({ [key]: value })
    },
    async removeItem(key) {
      await browser.storage.local.remove(key)
    },
  }
}

/** Falls back to an in-memory store outside an extension context (e.g. tests). */
function createMemoryStorage(): AsyncStorage {
  const memory = new Map<string, string>()
  return {
    getItem: (key) => Promise.resolve(memory.get(key) ?? null),
    setItem: (key, value) => {
      memory.set(key, value)
      return Promise.resolve()
    },
    removeItem: (key) => {
      memory.delete(key)
      return Promise.resolve()
    },
  }
}

export function createAuthStorage(): AsyncStorage {
  return typeof browser !== 'undefined' && browser.storage
    ? createBrowserStorage()
    : createMemoryStorage()
}
