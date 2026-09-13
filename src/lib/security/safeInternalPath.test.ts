import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { safeInternalPath, withNextPath } from './safeInternalPath'

describe('safeInternalPath', () => {
  it('keeps an internal path with its query and hash', () => {
    assert.equal(safeInternalPath('/profile', '/'), '/profile')
    assert.equal(safeInternalPath('/articles?page=2&sort=new#top', '/'), '/articles?page=2&sort=new#top')
    assert.equal(safeInternalPath('/', '/x'), '/')
  })

  it('rejects everything that resolves outside our origin — the open-redirect shapes', () => {
    for (const bad of [
      '//evil.example',
      '//evil.example/path',
      '/\\evil.example',
      'https://evil.example',
      'http:/evil.example',
      '%2F%2Fevil.example',
      '/%2F%2Fevil.example',
      '/%5Cevil.example',
      'javascript:alert(1)',
      '/\r\n/evil',
      'profile',
    ]) {
      assert.equal(safeInternalPath(bad, '/fallback'), '/fallback', bad)
    }
  })

  it('falls back on empty, null and whitespace', () => {
    assert.equal(safeInternalPath(null, '/'), '/')
    assert.equal(safeInternalPath(undefined, '/'), '/')
    assert.equal(safeInternalPath('   ', '/'), '/')
    assert.equal(safeInternalPath('', ''), '')
  })

  it('normalises dot segments so /../ cannot climb anywhere surprising', () => {
    assert.equal(safeInternalPath('/a/../profile', '/'), '/profile')
  })
})

describe('withNextPath', () => {
  it('encodes the path so its own query does not split the outer one', () => {
    assert.equal(withNextPath('/login', '/some/path?a=1&b=2'), '/login?nextPath=%2Fsome%2Fpath%3Fa%3D1%26b%3D2')
    assert.equal(new URLSearchParams(withNextPath('/refresh', '/x?a=1&b=2').split('?')[1]).get('nextPath'), '/x?a=1&b=2')
  })
})
