import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { preferMarkdownAccept } from './preferMarkdownAccept'

describe('preferMarkdownAccept', () => {
  it('is false without header', () => {
    assert.equal(preferMarkdownAccept(null), false)
    assert.equal(preferMarkdownAccept(''), false)
  })

  it('prefers markdown when only text/markdown', () => {
    assert.equal(preferMarkdownAccept('text/markdown'), true)
  })

  it('prefers markdown when q is higher than html', () => {
    assert.equal(preferMarkdownAccept('text/html;q=0.8, text/markdown;q=0.9'), true)
  })

  it('prefers html when q is higher', () => {
    assert.equal(preferMarkdownAccept('text/markdown;q=0.8, text/html;q=0.9'), false)
  })

  it('uses order on tie', () => {
    assert.equal(preferMarkdownAccept('text/markdown, text/html'), true)
    assert.equal(preferMarkdownAccept('text/html, text/markdown'), false)
  })
})
