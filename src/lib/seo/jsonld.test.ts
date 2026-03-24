import assert from 'node:assert/strict'
import test from 'node:test'

import { seoConfig } from './config'
import { getArticleJsonLd, getOrganizationJsonLd, getWebSiteJsonLd } from './jsonld'

type OrganizationLeaf = {
  '@type': 'Organization'
  name: string
  url: string
}

type WebSiteLeaf = {
  '@type': 'WebSite'
  name: string
  url: string
}

const assertHttpsAbsoluteUrl = (value: string, label: string) => {
  assert.match(value, /^https:\/\/.+/u, `${label} must be an absolute https URL`)
}

/** Site URL from env may be http (e.g. localhost). */
const assertAbsoluteHttpUrl = (value: string, label: string) => {
  assert.match(value, /^https?:\/\/.+/u, `${label} must be an absolute http(s) URL`)
}

const articleFixture = {
  slug: 'my-post',
  title: 'Test headline',
  description: 'Short description',
  image: 'https://cdn.example.com/og.jpg',
  datePublished: '2025-01-01T12:00:00.000Z',
  dateModified: '2025-02-01T12:00:00.000Z',
  canonicalUrl: 'https://example.com/article/my-post',
  keywords: 'foo, bar',
  isAccessibleForFree: true,
}

test('getArticleJsonLd returns Article shape with required fields and https URLs', () => {
  const ld = getArticleJsonLd(articleFixture)

  assert.equal(ld['@context'], 'https://schema.org')
  assert.equal(ld['@type'], 'Article')
  assert.equal(ld.headline, articleFixture.title)
  assert.equal(ld.url, articleFixture.canonicalUrl)
  assert.equal(ld.mainEntityOfPage, articleFixture.canonicalUrl)
  assert.equal(ld['@id'], `${articleFixture.canonicalUrl}#article`)

  assertHttpsAbsoluteUrl(ld.url, 'url')
  assertHttpsAbsoluteUrl(ld.mainEntityOfPage as string, 'mainEntityOfPage')
  assert.match(String(ld['@id']), /^https:\/\/.+#article$/u, '@id must be canonical + #article')

  assert.equal(ld.description, articleFixture.description)
  assert.equal(ld.image, articleFixture.image)
  assert.equal(ld.datePublished, articleFixture.datePublished)
  assert.equal(ld.dateModified, articleFixture.dateModified)
  assert.equal(ld.keywords, 'foo, bar')
  assert.equal(ld.isAccessibleForFree, true)
  assert.equal(ld.inLanguage, seoConfig.defaultLocale)

  assert.equal((ld.author as OrganizationLeaf)['@type'], 'Organization')
  assert.equal((ld.publisher as OrganizationLeaf)['@type'], 'Organization')
  assertAbsoluteHttpUrl((ld.author as OrganizationLeaf)?.url as string, 'author.url')
  assertAbsoluteHttpUrl((ld.publisher as OrganizationLeaf)?.url as string, 'publisher.url')
})

test('getArticleJsonLd omits optional keywords when empty', () => {
  const ld = getArticleJsonLd({
    slug: 'x',
    title: 'T',
    canonicalUrl: 'https://example.com/article/x',
    keywords: '   ',
  })

  assert.equal('keywords' in ld, false)
})

test('getArticleJsonLd omits isAccessibleForFree when undefined', () => {
  const ld = getArticleJsonLd({
    slug: 'x',
    title: 'T',
    canonicalUrl: 'https://example.com/article/x',
  })

  assert.equal('isAccessibleForFree' in ld, false)
})

test('getOrganizationJsonLd and getWebSiteJsonLd expose https site url', () => {
  const org = getOrganizationJsonLd()
  const site = getWebSiteJsonLd()

  assert.equal((org as OrganizationLeaf)['@type'], 'Organization')
  assertAbsoluteHttpUrl((org as OrganizationLeaf)?.url as string, 'Organization.url')

  assert.equal((site as WebSiteLeaf)['@type'], 'WebSite')
  assertAbsoluteHttpUrl((site as WebSiteLeaf)?.url as string, 'WebSite.url')
  assert.equal(site.inLanguage, seoConfig.defaultLocale)
})
