import { afterEach, describe, expect, it } from 'vitest'
import { claudeAdapter } from '../adapter'

describe('claudeAdapter.matches', () => {
  it('matches claude.ai', () => {
    expect(claudeAdapter.matches(new URL('https://claude.ai/chat/123'))).toBe(true)
  })

  it('does not match an unrelated provider', () => {
    expect(claudeAdapter.matches(new URL('https://chatgpt.com/c/123'))).toBe(false)
  })
})

describe('claudeAdapter.identify', () => {
  it('extracts the externalId from a valid conversation URL', () => {
    const url = new URL('https://claude.ai/chat/12345678-1234-1234-1234-123456789abc')
    expect(claudeAdapter.identify(url)).toEqual({
      externalId: '12345678-1234-1234-1234-123456789abc',
      url: url.toString(),
    })
  })

  it('returns null for an unexpected route (no conversation id)', () => {
    expect(claudeAdapter.identify(new URL('https://claude.ai/'))).toBeNull()
  })

  it('returns null when the id segment is not a UUID', () => {
    expect(claudeAdapter.identify(new URL('https://claude.ai/chat/not-a-uuid'))).toBeNull()
  })
})

describe('claudeAdapter.getTitle', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.title = ''
  })

  it('reads the active chat link when present', () => {
    document.body.innerHTML = '<a data-testid="chat-menu-trigger">Sociology notes</a>'
    expect(claudeAdapter.getTitle?.(document)).toBe('Sociology notes')
  })

  it('falls back to document.title when the selector finds nothing', () => {
    document.title = 'Sociology notes - Claude'
    expect(claudeAdapter.getTitle?.(document)).toBe('Sociology notes')
  })

  it('returns null (not a crash) when no title signal is available', () => {
    expect(claudeAdapter.getTitle?.(document)).toBeNull()
  })
})
