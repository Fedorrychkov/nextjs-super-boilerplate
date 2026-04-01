import assert from 'node:assert/strict'
import test from 'node:test'

import { detectAiReferralSourceFromUtm, extractUtmSourceFromPageUrl } from './aiReferrals'

test('extractUtmSourceFromPageUrl reads utm_source from full URL', () => {
  assert.equal(extractUtmSourceFromPageUrl('https://x.com/p?utm_source=chatgpt&utm_medium=referral'), 'chatgpt')
  assert.equal(extractUtmSourceFromPageUrl('https://x.com/p?foo=1&utm_source=openai'), 'openai')
  assert.equal(extractUtmSourceFromPageUrl('https://x.com/p'), null)
})

test('detectAiReferralSourceFromUtm maps common AI campaign values', () => {
  assert.equal(detectAiReferralSourceFromUtm('chatgpt'), 'chatgpt')
  assert.equal(detectAiReferralSourceFromUtm('openai'), 'chatgpt')
  assert.equal(detectAiReferralSourceFromUtm('gpt'), 'chatgpt')
  assert.equal(detectAiReferralSourceFromUtm('perplexity'), 'perplexity')
  assert.equal(detectAiReferralSourceFromUtm('bing_copilot'), 'copilot')
  assert.equal(detectAiReferralSourceFromUtm('gemini'), 'gemini')
  assert.equal(detectAiReferralSourceFromUtm('claude'), 'claude')
  assert.equal(detectAiReferralSourceFromUtm('newsletter'), null)
})
