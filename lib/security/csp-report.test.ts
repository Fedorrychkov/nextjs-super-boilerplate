import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { cspViolations } from './csp-report'

describe('cspViolations', () => {
  it('reads the legacy report-uri format, keeping only scheme and host', () => {
    const payload = {
      'csp-report': {
        'document-uri': 'https://site.example/profile?token=secret',
        'effective-directive': 'script-src-elem',
        'blocked-uri': 'https://evil.example/x.js?id=42',
      },
    }

    assert.deepEqual(cspViolations(payload), [{ directive: 'script-src-elem', blocked: 'https://evil.example' }])
  })

  it('reads the Reporting API format and keeps keywords as they are', () => {
    const payload = [
      { type: 'csp-violation', body: { effectiveDirective: 'script-src', blockedURL: 'eval' } },
      { type: 'deprecation', body: {} },
    ]

    assert.deepEqual(cspViolations(payload), [{ directive: 'script-src', blocked: 'eval' }])
  })

  it('never echoes a page url, a path or a query', () => {
    const [violation] = cspViolations({ 'csp-report': { 'violated-directive': 'img-src https:', 'blocked-uri': 'https://a.example/u/123/avatar.png' } })

    assert.equal(violation?.blocked, 'https://a.example')
    assert.equal(violation?.directive, 'img-src')
  })

  it('caps how many entries one report can log and ignores garbage', () => {
    const many = Array.from({ length: 50 }, () => ({ type: 'csp-violation', body: { effectiveDirective: 'img-src', blockedURL: 'data' } }))

    assert.equal(cspViolations(many).length, 10)
    assert.deepEqual(cspViolations('nope'), [])
    assert.deepEqual(cspViolations(null), [])
    assert.deepEqual(cspViolations({ 'csp-report': { 'effective-directive': 'DROP TABLE x', 'blocked-uri': 42 } }), [
      { directive: 'unknown', blocked: 'unknown' },
    ])
  })
})
