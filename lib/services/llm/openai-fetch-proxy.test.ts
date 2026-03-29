import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { parseProxyAccessesJsonToHttpUrls, parseProxyAccessLineToHttpUrl } from './openai-fetch-proxy'

describe('parseProxyAccessLineToHttpUrl', () => {
  it('parses host:port:user:pass', () => {
    assert.equal(parseProxyAccessLineToHttpUrl('1.2.3.4:8080:u:p'), 'http://u:p@1.2.3.4:8080')
  })

  it('ignores optional 5th geo segment', () => {
    assert.equal(parseProxyAccessLineToHttpUrl('1.2.3.4:8080:u:p:de'), 'http://u:p@1.2.3.4:8080')
  })

  it('joins password segments when colons in password', () => {
    assert.equal(parseProxyAccessLineToHttpUrl('h:9:u:pa:ss:de'), 'http://u:pa%3Ass@h:9')
  })
})

describe('parseProxyAccessesJsonToHttpUrls', () => {
  it('parses JSON array to proxy URLs', () => {
    const raw = JSON.stringify(['1.1.1.1:9:a:b:de', '2.2.2.2:8:x:y'])
    const urls = parseProxyAccessesJsonToHttpUrls(raw)

    assert.deepEqual(urls, ['http://a:b@1.1.1.1:9', 'http://x:y@2.2.2.2:8'])
  })

  it('returns empty for invalid JSON or empty', () => {
    assert.deepEqual(parseProxyAccessesJsonToHttpUrls(''), [])
    assert.deepEqual(parseProxyAccessesJsonToHttpUrls(undefined), [])
    assert.deepEqual(parseProxyAccessesJsonToHttpUrls('not-json'), [])
  })
})
