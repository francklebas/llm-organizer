import { afterEach, describe, expect, it } from 'vitest'
import { chatgptAdapter } from '../adapter'

describe('chatgptAdapter.matches', () => {
  it('matches chatgpt.com and the legacy chat.openai.com host', () => {
    expect(chatgptAdapter.matches(new URL('https://chatgpt.com/c/123'))).toBe(true)
    expect(chatgptAdapter.matches(new URL('https://chat.openai.com/c/123'))).toBe(true)
  })

  it('does not match an unrelated provider', () => {
    expect(chatgptAdapter.matches(new URL('https://claude.ai/chat/123'))).toBe(false)
  })
})

describe('chatgptAdapter.identify', () => {
  it('extracts the externalId from a valid conversation URL', () => {
    const url = new URL('https://chatgpt.com/c/12345678-1234-1234-1234-123456789abc')
    expect(chatgptAdapter.identify(url)).toEqual({
      externalId: '12345678-1234-1234-1234-123456789abc',
      url: url.toString(),
    })
  })

  it('returns null for an unexpected route (no conversation id)', () => {
    expect(chatgptAdapter.identify(new URL('https://chatgpt.com/'))).toBeNull()
  })

  it('returns null when the id segment is not a UUID', () => {
    expect(chatgptAdapter.identify(new URL('https://chatgpt.com/c/not-a-uuid'))).toBeNull()
  })
})

describe('chatgptAdapter.getTitle', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.title = ''
  })

  it('reads the active sidebar link when present', () => {
    document.body.innerHTML = '<nav><a data-active="true">Sociology notes</a></nav>'
    expect(chatgptAdapter.getTitle?.(document)).toBe('Sociology notes')
  })

  it('falls back to document.title when the selector finds nothing', () => {
    document.title = 'Sociology notes - ChatGPT'
    expect(chatgptAdapter.getTitle?.(document)).toBe('Sociology notes')
  })

  it('returns null (not a crash) when no title signal is available', () => {
    expect(chatgptAdapter.getTitle?.(document)).toBeNull()
  })
})
