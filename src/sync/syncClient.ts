/**
 * Thin abstraction over the Supabase calls the sync engine needs, so the engine's push/pull
 * logic can be unit-tested with a mock client instead of a live Supabase project.
 *
 * Declared as function properties (not method shorthand) so mocks can be passed around and
 * asserted on (`expect(client.upsert).toHaveBeenCalledWith(...)`) without `unbound-method` lint
 * complaints, which assume method shorthand relies on a `this` binding.
 */
export interface SyncClient {
  upsert: (table: string, rows: Record<string, unknown>[]) => Promise<{ error: Error | null }>
  update: (
    table: string,
    entityId: string,
    changes: Record<string, unknown>,
  ) => Promise<{ error: Error | null }>
  deleteRow: (table: string, match: Record<string, string>) => Promise<{ error: Error | null }>
  selectUpdatedSince: (
    table: string,
    cursorColumn: string,
    cursor: string,
  ) => Promise<{ data: Record<string, unknown>[] | null; error: Error | null }>
}
