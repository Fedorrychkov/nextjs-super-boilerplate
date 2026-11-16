import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildQrPath } from './qrPath'

describe('buildQrPath', () => {
  it('draws a square grid of modules locally', () => {
    const cells = buildQrPath('otpauth://totp/App:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=App')

    // Version 1 is 21 modules, every next version adds 4.
    assert.equal((cells.count - 21) % 4, 0)
    assert.match(cells.path, /^M\d+ \d+h1v1h-1z/)
  })

  it('is deterministic and depends on the payload', () => {
    assert.equal(buildQrPath('a').path, buildQrPath('a').path)
    assert.notEqual(buildQrPath('a').path, buildQrPath('b').path)
  })
})
