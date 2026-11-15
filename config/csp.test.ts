import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { CSP_REPORT_PATH, cspEnv, enforcedCsp, reportOnlyCsp } from './csp'

const directive = (policy: string, name: string) => policy.split('; ').find((part) => part.startsWith(`${name} `)) ?? ''

const prod = cspEnv({ NODE_ENV: 'production', API_URL: 'https://api.example.com/v1' })
const dev = cspEnv({ NODE_ENV: 'development' })

describe('csp', () => {
  it('drops the third-party analytics hosts no code loads', () => {
    for (const policy of [enforcedCsp(prod), reportOnlyCsp(prod)]) {
      assert.ok(!policy.includes('mc.yandex'))
      assert.ok(!policy.includes('google-analytics'))
      assert.ok(!policy.includes('googletagmanager'))
      assert.ok(!policy.includes('yclients'))
    }
  })

  it('keeps the enforced policy as permissive as before for scripts and connections', () => {
    assert.match(directive(enforcedCsp(prod), 'script-src'), /'unsafe-eval'/)
    assert.match(directive(enforcedCsp(prod), 'connect-src'), / https: /)
    assert.match(directive(enforcedCsp(prod), 'connect-src'), /https:\/\/api\.example\.com/)
  })

  it('upgrades insecure requests in production only (Safari applies it to localhost)', () => {
    assert.ok(enforcedCsp(prod).includes('upgrade-insecure-requests'))
    assert.ok(!enforcedCsp(dev).includes('upgrade-insecure-requests'))
    assert.ok(!reportOnlyCsp(prod).includes('upgrade-insecure-requests'))
  })

  it('reports the strict candidate: no eval and no bare https: in production', () => {
    const strict = reportOnlyCsp(prod)

    assert.doesNotMatch(directive(strict, 'script-src'), /unsafe-eval/)
    assert.doesNotMatch(directive(strict, 'connect-src'), / https: /)
    assert.ok(strict.includes(`report-uri ${CSP_REPORT_PATH}`))
    // next dev needs eval for React Refresh.
    assert.match(directive(reportOnlyCsp(dev), 'script-src'), /'unsafe-eval'/)
  })

  it('adds third-party hosts of a fork to both policies', () => {
    const thirdParty = { script: ['https://mc.yandex.ru'], connect: ['https://mc.yandex.ru'] }

    assert.match(directive(enforcedCsp(prod, thirdParty), 'script-src'), /mc\.yandex\.ru/)
    assert.match(directive(reportOnlyCsp(prod, thirdParty), 'connect-src'), /mc\.yandex\.ru/)
  })
})
