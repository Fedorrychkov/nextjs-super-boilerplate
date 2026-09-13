import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { checkContentLength, MULTIPART_OVERHEAD_BYTES } from './uploadContentLength'

const headers = (value: string | null) => ({ get: (name: string) => (name === 'content-length' ? value : null) })

describe('checkContentLength', () => {
  it('accepts a body under the limit and exactly at the limit plus the multipart overhead', () => {
    assert.equal(checkContentLength(headers('10'), 100), 'within')
    assert.equal(checkContentLength(headers(String(100 + MULTIPART_OVERHEAD_BYTES)), 100), 'within')
  })

  it('refuses a body over the limit before it is read', () => {
    assert.equal(checkContentLength(headers(String(100 + MULTIPART_OVERHEAD_BYTES + 1)), 100), 'too_large')
    assert.equal(checkContentLength(headers('209715200'), 1024), 'too_large')
  })

  it('cannot judge a missing, empty or non-numeric header — the caller keeps the old path', () => {
    assert.equal(checkContentLength(headers(null), 100), 'unknown')
    assert.equal(checkContentLength(headers(''), 100), 'unknown')
    assert.equal(checkContentLength(headers('abc'), 100), 'unknown')
    assert.equal(checkContentLength(headers('-1'), 100), 'unknown')
  })
})
