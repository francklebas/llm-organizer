/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment,
   @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access --
   The sync engine dispatches on a table name known only at runtime (from `MutationEntity`),
   which the generated `Database` type can't express without losing the point of this adapter.
   This file is the single, deliberate `any` boundary between the untyped table dispatch and the
   fully typed `SyncClient` interface it implements — every caller of `createSupabaseSyncClient`
   stays type-safe. */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../supabase/types'
import type { SyncClient } from './syncClient'

type AnyTableName = keyof Database['public']['Tables']

function fromTable(client: SupabaseClient<Database>, table: string): any {
  return client.from(table as AnyTableName)
}

/** Adapts the real Supabase client to the minimal `SyncClient` interface the engine depends on. */
export function createSupabaseSyncClient(client: SupabaseClient<Database>): SyncClient {
  return {
    async upsert(table, rows) {
      const { error } = await fromTable(client, table).upsert(rows, { onConflict: 'id' })
      return { error }
    },
    async update(table, entityId, changes) {
      const { error } = await fromTable(client, table).update(changes).eq('id', entityId)
      return { error }
    },
    async deleteRow(table, match) {
      let query = fromTable(client, table).delete()
      for (const [column, value] of Object.entries(match)) {
        query = query.eq(column, value)
      }
      const { error } = await query
      return { error }
    },
    async selectUpdatedSince(table, cursorColumn, cursor) {
      const { data, error } = await fromTable(client, table)
        .select('*')
        .gt(cursorColumn, cursor)
        .order(cursorColumn, { ascending: true })
        .limit(500)
      return { data: data as Record<string, unknown>[] | null, error }
    },
  }
}
