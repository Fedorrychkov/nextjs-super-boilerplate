import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { isHashedRefreshTokenValue, refreshTokenQuery, storedRefreshTokenValue } from './refresh-token-hash'

describe('refresh token hashing', () => {
  it('stores a prefixed sha256, never the token itself', () => {
    const stored = storedRefreshTokenValue('eyJ.token.sig')

    assert.match(stored, /^h:[0-9a-f]{64}$/)
    assert.ok(!stored.includes('eyJ'))
    assert.equal(stored, storedRefreshTokenValue('eyJ.token.sig'))
    assert.notEqual(stored, storedRefreshTokenValue('eyJ.token.sig2'))
  })

  it('tells a hashed row from a legacy plain one', () => {
    assert.equal(isHashedRefreshTokenValue(storedRefreshTokenValue('a')), true)
    // A JWT starts with "eyJ", so it can never be mistaken for the prefix.
    assert.equal(isHashedRefreshTokenValue('eyJhbGciOiJIUzI1NiJ9.x.y'), false)
  })

  it('looks a token up by both forms during the transition', () => {
    assert.deepEqual(refreshTokenQuery('t'), { token: { $in: [storedRefreshTokenValue('t'), 't'] } })
  })
})
