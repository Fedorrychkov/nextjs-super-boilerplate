import assert from 'node:assert/strict'
import test from 'node:test'

import { finalizeArticleBodyHtml } from '~/lib/editor/finalizeArticleBodyHtml'

import { isAllowedResourceUrl, isAllowedSrcsetValue, sanitizeArticleHtml } from './articleHtml'

test('sanitizeArticleHtml removes script tags', () => {
  const html = '<p>x</p><script>alert(1)</script><p>y</p>'
  const out = sanitizeArticleHtml(html)

  assert.match(out, /<p>x<\/p>/)
  assert.match(out, /<p>y<\/p>/)
  assert.equal(out.includes('<script'), false)
})

test('sanitizeArticleHtml strips event handler attributes', () => {
  const html = '<p onclick="alert(1)">t</p>'
  const out = sanitizeArticleHtml(html)

  assert.equal(out.includes('onclick'), false)
  assert.match(out, /<p>t<\/p>/)
})

test('sanitizeArticleHtml strips disallowed javascript: href', () => {
  const html = '<a href="javascript:alert(1)">x</a>'
  const out = sanitizeArticleHtml(html)

  assert.match(out, /x/)
  assert.equal(/href\s*=\s*["'][^"']*javascript:/i.test(out), false)
  assert.equal(out.includes('javascript:'), false)
})

test('sanitizeArticleHtml keeps safe http(s) links', () => {
  const html = '<a href="https://example.com/path?q=1">x</a>'
  const out = sanitizeArticleHtml(html)

  assert.match(out, /href="https:\/\/example\.com\/path\?q=1"/)
})

test('sanitizeArticleHtml keeps same-origin-style paths for href', () => {
  const html = '<a href="/about">x</a>'
  const out = sanitizeArticleHtml(html)

  assert.match(out, /href="\/about"/)
})

test('isAllowedSrcsetValue accepts cdn thumb/inline descriptors', () => {
  const v = '/cdn/abc/thumb 600w, /cdn/abc/inline 1600w'

  assert.equal(isAllowedSrcsetValue(v), true)
})

test('finalizeArticleBodyHtml builds picture from asset img and leaves no script', () => {
  const html = '<p data-asset-id="xyz">before</p><img data-asset-id="abc" alt="hi" />'

  const out = finalizeArticleBodyHtml(html)

  assert.equal(out.includes('<script'), false)
  assert.match(out, /<picture>/)
  assert.match(out, /\/cdn\/abc\/inline/)
})

test('sanitizeArticleHtml strips onerror from img', () => {
  const html = '<picture><img src="/cdn/x/inline" onerror="alert(1)" alt="x" /></picture>'
  const out = sanitizeArticleHtml(html)

  assert.equal(out.includes('onerror'), false)
})

test('isAllowedResourceUrl blocks data and javascript for src', () => {
  assert.equal(isAllowedResourceUrl('javascript:void(0)', 'src'), false)
  assert.equal(isAllowedResourceUrl('data:text/html,xx', 'src'), false)
  assert.equal(isAllowedResourceUrl('/cdn/foo/inline', 'src'), true)
})
