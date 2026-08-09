import { describe, expect, it } from 'vitest'
import { matchesSearch } from './search'

const conversation = { title: 'Architecture du matching ATS', provider: 'chatgpt' }

describe('matchesSearch', () => {
  it('matches on title', () => {
    expect(matchesSearch(conversation, undefined, [], 'matching')).toBe(true)
  })

  it('matches on provider', () => {
    expect(matchesSearch(conversation, undefined, [], 'chatgpt')).toBe(true)
  })

  it('matches on folder name', () => {
    expect(matchesSearch(conversation, 'CV Generator', [], 'generator')).toBe(true)
  })

  it('matches on tag name', () => {
    expect(matchesSearch(conversation, undefined, ['ATS', 'architecture'], 'ats')).toBe(true)
  })

  it('is case-insensitive and returns false when nothing matches', () => {
    expect(matchesSearch(conversation, undefined, [], 'sociology')).toBe(false)
  })

  it('matches everything when the query is empty', () => {
    expect(matchesSearch(conversation, undefined, [], '  ')).toBe(true)
  })
})
