import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { tokenTypeOf } from './token-type'

const HOUR = 3600
const DAY = 24 * HOUR

describe('tokenTypeOf', () => {
  it('trusts an explicit typ', () => {
    assert.equal(tokenTypeOf({ typ: 'access', iat: 0, exp: 180 * DAY }, HOUR), 'access')
    assert.equal(tokenTypeOf({ typ: 'refresh', iat: 0, exp: 60 }, HOUR), 'refresh')
  })

  it('rejects an unknown typ instead of guessing', () => {
    assert.equal(tokenTypeOf({ typ: 'id', iat: 0, exp: 60 }, HOUR), null)
    assert.equal(tokenTypeOf({ typ: 1, iat: 0, exp: 60 }, HOUR), null)
  })

  it('classifies a legacy token without typ by its lifetime', () => {
    // Legacy access: exactly the access TTL, or a second more from rounding.
    assert.equal(tokenTypeOf({ iat: 1000, exp: 1000 + HOUR }, HOUR), 'access')
    assert.equal(tokenTypeOf({ iat: 1000, exp: 1000 + HOUR + 1 }, HOUR), 'access')
    // Legacy refresh: days, which is what made it usable as a Bearer.
    assert.equal(tokenTypeOf({ iat: 1000, exp: 1000 + 182 * DAY }, HOUR), 'refresh')
    assert.equal(tokenTypeOf({ iat: 1000, exp: 1000 + 7 * DAY }, HOUR), 'refresh')
  })

  it('cannot classify a legacy token without iat or exp', () => {
    assert.equal(tokenTypeOf({ exp: 100 }, HOUR), null)
    assert.equal(tokenTypeOf({ iat: 100 }, HOUR), null)
  })
})
