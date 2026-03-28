import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { countPublicArticleMarkdownTokens } from './countMarkdownTokens'

describe('countPublicArticleMarkdownTokens', () => {
  it('returns a positive integer for non-empty markdown', () => {
    const n = countPublicArticleMarkdownTokens('# Hello\n\nWorld.')

    assert.ok(Number.isInteger(n))
    assert.ok(n > 0)
  })

  it('returns 0 for empty string', () => {
    assert.equal(countPublicArticleMarkdownTokens(''), 0)
  })
})
