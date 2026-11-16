import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { acceptEvent, anonymousDistinctId, distinctIdForUser, routeTemplate, scrubStack, scrubText, shouldReportError } from './rules'

describe('acceptEvent', () => {
  it('keeps listed properties with listed values only', () => {
    assert.deepEqual(acceptEvent('auth:login', { method: 'oauth', email: 'a@b.c', extra: 1 }, false), { name: 'auth:login', props: { method: 'oauth' } })
    assert.deepEqual(acceptEvent('auth:login', { method: 'carrier-pigeon' }, false), { name: 'auth:login', props: {} })
  })

  it('drops unknown events and server-only events sent from a browser', () => {
    assert.equal(acceptEvent('user:deleted', {}, false), null)
    assert.equal(acceptEvent('auth:login', { method: 'password' }, true), null)
    assert.deepEqual(acceptEvent('$pageview', { route: '/x' }, true), { name: '$pageview', props: {} })
  })
})

describe('routeTemplate', () => {
  it('turns ids and numbers into :id and drops the query', () => {
    assert.equal(routeTemplate('/admin/users/6afaf7c35acaf11a0e888b1e?tab=security'), '/admin/users/:id')
    assert.equal(routeTemplate('/article/how-to/12345'), '/article/how-to/:id')
    assert.equal(routeTemplate('/'), '/')
    assert.equal(routeTemplate('/profile/'), '/profile')
    // The same input twice gives the same answer (a /g regex in .test() would not).
    assert.equal(routeTemplate('/a/6afaf7c35acaf11a0e888b1e'), routeTemplate('/a/6afaf7c35acaf11a0e888b1e'))
  })
})

describe('scrubText', () => {
  it('removes emails, tokens, ids, queries and long numbers', () => {
    const text = scrubText('user a.b@example.com 6afaf7c35acaf11a0e888b1e /x?token=abc eyJa.eyJb.sig 1234567 sk_abcdefghijklmnopqrstuvwxyz0123456789')

    assert.ok(!text.includes('example.com'))
    assert.ok(!text.includes('6afaf7c35acaf11a0e888b1e'))
    assert.ok(!text.includes('token=abc'))
    assert.ok(!text.includes('eyJa'))
    assert.ok(!text.includes('1234567'))
    assert.ok(!text.includes('sk_abcdefghij'))
  })

  it('cuts long text and long stacks', () => {
    assert.equal(scrubText('ab '.repeat(500)).length, 300)
    // A long run of token characters is itself treated as a secret.
    assert.equal(scrubText('x'.repeat(1000)), '<token>')
    assert.equal(scrubStack(Array.from({ length: 50 }, (_, i) => `at f${i}`).join('\n'))?.split('\n').length, 20)
  })
})

describe('shouldReportError', () => {
  it('reports one error once per window', () => {
    const seen = new Map<string, number>()

    assert.equal(shouldReportError(seen, 'E', 0), true)
    assert.equal(shouldReportError(seen, 'E', 1000), false)
    assert.equal(shouldReportError(seen, 'other', 1000), true)
    assert.equal(shouldReportError(seen, 'E', 5 * 60 * 1000), true)
  })
})

describe('distinct ids', () => {
  it('is stable per user, not the account id, and depends on the secret', () => {
    const id = distinctIdForUser('6afaf7c35acaf11a0e888b1e', 'secret')

    assert.equal(id, distinctIdForUser('6afaf7c35acaf11a0e888b1e', 'secret'))
    assert.ok(!id.includes('6afaf7c3'))
    assert.notEqual(id, distinctIdForUser('6afaf7c35acaf11a0e888b1e', 'other'))
  })

  it('accepts only a UUID as an anonymous id', () => {
    assert.equal(anonymousDistinctId('0b6f1b0c-1d9e-4c58-9a0e-8f1c2b3d4e5f'), 'a_0b6f1b0c-1d9e-4c58-9a0e-8f1c2b3d4e5f')
    assert.equal(anonymousDistinctId('<script>'), null)
  })
})
