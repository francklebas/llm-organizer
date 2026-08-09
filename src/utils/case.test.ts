import { describe, expect, it } from 'vitest'
import { toCamelCaseRow, toSnakeCaseRow } from './case'

describe('case conversion', () => {
  it('converts camelCase row keys to snake_case', () => {
    expect(toSnakeCaseRow({ workspaceId: 'w1', deletedAt: null, updatedAt: 'now' })).toEqual({
      workspace_id: 'w1',
      deleted_at: null,
      updated_at: 'now',
    })
  })

  it('converts snake_case row keys to camelCase', () => {
    expect(toCamelCaseRow({ workspace_id: 'w1', deleted_at: null, updated_at: 'now' })).toEqual({
      workspaceId: 'w1',
      deletedAt: null,
      updatedAt: 'now',
    })
  })
})
