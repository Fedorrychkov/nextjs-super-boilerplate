import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { externalDemoUrl } from './external-demo'

describe('externalDemoUrl', () => {
  it('hides the demo link on the demo itself — the way the header pointed at its own homepage', () => {
    assert.equal(externalDemoUrl('https://nextjs-super-boilerplate.visn-ai.io', 'https://nextjs-super-boilerplate.visn-ai.io'), null)
    assert.equal(externalDemoUrl('https://nextjs-super-boilerplate.visn-ai.io/', 'https://nextjs-super-boilerplate.visn-ai.io'), null)
  })

  it('keeps the link when the demo lives elsewhere', () => {
    assert.equal(
      externalDemoUrl('https://nextjs-super-boilerplate.visn-ai.io', 'https://my-product.example.com'),
      'https://nextjs-super-boilerplate.visn-ai.io',
    )
    assert.equal(externalDemoUrl('https://demo.example.com', 'http://localhost:3000'), 'https://demo.example.com')
  })

  it('treats empty and null as no link', () => {
    assert.equal(externalDemoUrl(null, 'https://x.example'), null)
    assert.equal(externalDemoUrl('  ', 'https://x.example'), null)
  })

  it('returns an unparsable value as is rather than dropping it silently', () => {
    assert.equal(externalDemoUrl('not a url', 'https://x.example'), 'not a url')
    assert.equal(externalDemoUrl('https://demo.example.com', 'not a url'), 'https://demo.example.com')
  })
})
