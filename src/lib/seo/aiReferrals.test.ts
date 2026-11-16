import assert from 'node:assert/strict'
import test from 'node:test'

import { detectAiReferralSource, detectAiReferralSourceFromUtm, extractUtmSourceFromPageUrl } from './aiReferrals'

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
  assert.equal(detectAiReferralSourceFromUtm('newsletter'), 'other')
})

test('HTTP referrers match real AI domains and their subdomains', () => {
  for (const [url, source] of [
    ['https://chatgpt.com/', 'chatgpt'],
    ['https://chat.openai.com/c/example', 'chatgpt'],
    ['https://www.perplexity.ai/search/example', 'perplexity'],
    ['https://COPILOT.MICROSOFT.COM:8443/', 'copilot'],
    ['https://gemini.google.com/app', 'gemini'],
    ['https://claude.ai/chat/example', 'claude'],
  ]) {
    assert.equal(detectAiReferralSource(url), source, url)
  }
})

test('ordinary Bing traffic is not attributed to Copilot', () => {
  assert.equal(detectAiReferralSource('https://www.bing.com/search?q=example'), null)
  assert.equal(detectAiReferralSource('https://bing.com/'), null)
  assert.equal(detectAiReferralSourceFromUtm('bing'), 'other')
  assert.equal(detectAiReferralSourceFromUtm('bing_ads'), 'other')
})

test('lookalike domains and invalid referrers are not attributed to AI', () => {
  for (const url of [
    'https://notchatgpt.com.example.org/page',
    'https://chatgpt.com.example.org/',
    'https://fakeperplexity.ai/',
    'https://copilot.microsoft.com.evil.example/',
    'https://chatgpt.com@evil.example/',
    'https://example.org/?next=https://claude.ai',
    'not a URL',
    '',
  ]) {
    assert.equal(detectAiReferralSource(url), null, url)
  }
})
