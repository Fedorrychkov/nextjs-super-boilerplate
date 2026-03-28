import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildPublicArticleContentSignalHeader } from './contentSignal'

describe('buildPublicArticleContentSignalHeader', () => {
  it('allows training when true', () => {
    assert.equal(buildPublicArticleContentSignalHeader(true), 'ai-train=yes, search=yes, ai-input=yes')
  })

  it('disallows training when false', () => {
    assert.equal(buildPublicArticleContentSignalHeader(false), 'ai-train=no, search=yes, ai-input=yes')
  })
})
