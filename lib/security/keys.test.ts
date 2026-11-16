import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { decryptSecret, derivedKey, encryptSecret } from './keys'

const MASTER = 'a'.repeat(64)

describe('keys', () => {
  it('round-trips a secret and never stores it in the clear', () => {
    const sealed = encryptSecret('phc_secret_key', 'platform-settings', MASTER)

    assert.ok(!sealed.includes('phc_secret_key'))
    assert.equal(decryptSecret(sealed, 'platform-settings', MASTER), 'phc_secret_key')
    // A fresh IV each time: equal secrets do not look equal in the database.
    assert.notEqual(sealed, encryptSecret('phc_secret_key', 'platform-settings', MASTER))
  })

  it('refuses a wrong master key or a tampered value instead of returning garbage', () => {
    const sealed = encryptSecret('x', 'platform-settings', MASTER)

    assert.throws(() => decryptSecret(sealed, 'platform-settings', 'b'.repeat(64)))

    const [iv, tag, data] = sealed.split('.')
    const flipped = Buffer.from(data!, 'base64url')

    flipped[0] = (flipped[0] ?? 0) ^ 1
    assert.throws(() => decryptSecret([iv, tag, flipped.toString('base64url')].join('.'), 'platform-settings', MASTER))
    assert.throws(() => decryptSecret('not-sealed', 'platform-settings', MASTER))
  })

  it('needs a master key', () => {
    assert.throws(() => derivedKey('platform-settings', ''), /MFA_ENCRYPTION_KEY/)
  })
})
