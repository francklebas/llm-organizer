import { describe, expect, it } from 'vitest'
import { generateId } from './uuid'

describe('generateId', () => {
  it('generates distinct RFC 4122 v4 UUIDs', () => {
    const a = generateId()
    const b = generateId()
    expect(a).not.toBe(b)
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })
})
