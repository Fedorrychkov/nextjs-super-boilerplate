import assert from 'node:assert/strict'
import test from 'node:test'

import { ArticleVisibility } from '~/api/article'

import { getT } from '../i18n'
import { buildDefaultArticleUrl, resolveArticleCanonicalUrl, validateCanonicalUrlForStorage } from './articleCanonical'

const site = 'https://example.com'

test('buildDefaultArticleUrl uses article segment for public', () => {
  assert.equal(buildDefaultArticleUrl(site, 'hello-world', ArticleVisibility.PUBLIC), 'https://example.com/article/hello-world')
})

test('buildDefaultArticleUrl uses private-article for non-public', () => {
  assert.equal(buildDefaultArticleUrl(site, 'hello-world', ArticleVisibility.PRIVATE), 'https://example.com/private-article/hello-world')
})

test('resolveArticleCanonicalUrl falls back when seo canonical is foreign', () => {
  assert.equal(resolveArticleCanonicalUrl(site, 's', ArticleVisibility.PUBLIC, 'https://evil.com/page'), 'https://example.com/article/s')
})

test('resolveArticleCanonicalUrl keeps same-origin override', () => {
  assert.equal(resolveArticleCanonicalUrl(site, 's', ArticleVisibility.PUBLIC, 'https://example.com/article/s?x=1'), 'https://example.com/article/s?x=1')
})

test('validateCanonicalUrlForStorage rejects wrong origin', () => {
  const r = validateCanonicalUrlForStorage('https://other.com/x', site, getT('en'))

  assert.equal(r.ok, false)
})

test('validateCanonicalUrlForStorage accepts same origin', () => {
  const r = validateCanonicalUrlForStorage('https://example.com/article/foo', site, getT('en'))

  assert.equal(r.ok, true)

  if (r.ok) {
    assert.equal(r.value, 'https://example.com/article/foo')
  }
})
