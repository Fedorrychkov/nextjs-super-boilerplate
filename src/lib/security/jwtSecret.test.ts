import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { DEFAULT_JWT_SECRET, isMissingOrDefaultJwtSecret, isShortJwtSecret } from './jwtSecret'

describe('isMissingOrDefaultJwtSecret', () => {
  it('is true only for empty and the repository default — the cases that stop a production start', () => {
    assert.equal(isMissingOrDefaultJwtSecret(''), true)
    assert.equal(isMissingOrDefaultJwtSecret(null), true)
    assert.equal(isMissingOrDefaultJwtSecret(undefined), true)
    assert.equal(isMissingOrDefaultJwtSecret(DEFAULT_JWT_SECRET), true)
    assert.equal(isMissingOrDefaultJwtSecret('short'), false)
  })
})

describe('isShortJwtSecret', () => {
  it('flags anything under 32 characters as a warning, never for empty (that is the other rule)', () => {
    assert.equal(isShortJwtSecret('a'.repeat(31)), true)
    assert.equal(isShortJwtSecret('a'.repeat(32)), false)
    assert.equal(isShortJwtSecret('0123456789abcdef'.repeat(4)), false)
    assert.equal(isShortJwtSecret(''), false)
  })
})
