import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'

import { posthogSink } from './sinks'
import type { MetricEvent } from './types'

const realFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = realFetch
})

const capture = () => {
  const calls: { url: string; body: any }[] = []

  globalThis.fetch = (async (url: string, init: { body: string }) => {
    calls.push({ url, body: JSON.parse(init.body) })

    return new Response('{}', { status: 200 })
  }) as unknown as typeof fetch

  return calls
}

const base: MetricEvent = {
  uuid: '0b6f1b0c-1d9e-4c58-9a0e-8f1c2b3d4e5f',
  name: '$pageview',
  props: {},
  distinctId: 'a_0b6f1b0c-1d9e-4c58-9a0e-8f1c2b3d4e5f',
  side: 'client',
  route: '/articles',
  env: 'production',
  at: new Date('2026-11-16T10:00:00Z'),
}

describe('posthogSink', () => {
  it('sends no IP or geo, and no person profile for an anonymous browser', async () => {
    const calls = capture()

    await posthogSink('https://eu.i.posthog.com/', 'phc_key').send([base])

    assert.equal(calls[0]?.url, 'https://eu.i.posthog.com/batch/')
    assert.equal(calls[0]?.body.api_key, 'phc_key')

    const props = calls[0]?.body.batch[0].properties

    assert.equal(props.$ip, null)
    assert.equal(props.$geoip_disable, true)
    assert.equal(props.$process_person_profile, false)
    assert.equal(props.route, '/articles')
  })

  it('keeps a person profile for a signed-in (pseudonymous) user', async () => {
    const calls = capture()

    await posthogSink('https://eu.i.posthog.com', 'phc_key').send([{ ...base, distinctId: 'u_abc', name: 'auth:login', props: { method: 'oauth' } }])

    const props = calls[0]?.body.batch[0].properties

    assert.equal(props.$process_person_profile, undefined)
    assert.equal(props.method, 'oauth')
  })

  it('sends errors in the $exception shape PostHog groups', async () => {
    const calls = capture()

    await posthogSink('https://eu.i.posthog.com', 'phc_key').send([
      { ...base, name: '$exception', error: { type: 'TypeError', message: 'x is undefined', stack: 'at f (a.js:1:1)' } },
    ])

    const list = calls[0]?.body.batch[0].properties.$exception_list

    assert.equal(list[0].type, 'TypeError')
    assert.equal(list[0].value, 'x is undefined')
    assert.equal(list[0].mechanism.handled, false)
  })

  it('refuses to send without a key and reports a refusing server', async () => {
    await assert.rejects(posthogSink('https://eu.i.posthog.com', '').send([base]), /posthogKey/)

    globalThis.fetch = (async () => new Response('', { status: 401 })) as unknown as typeof fetch
    await assert.rejects(posthogSink('https://eu.i.posthog.com', 'k').send([base]), /401/)
  })
})
