import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { MediaResourceType } from '~/api/media/model'

import { decideUploadMime, isProviderMimeConsistent, isRasterImageMime, sniffFileMime } from './fileSignature'

const bytes = (...values: number[]) => new Uint8Array(values)
const text = (value: string) => new TextEncoder().encode(value)

const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10)
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00)
const WEBP = new Uint8Array([...text('RIFF'), 0x24, 0x00, 0x00, 0x00, ...text('WEBP'), ...text('VP8 ')])
const HEIC = new Uint8Array([0x00, 0x00, 0x00, 0x18, ...text('ftyp'), ...text('heic'), 0x00])

describe('sniffFileMime', () => {
  it('recognises the raster formats the upload field accepts', () => {
    assert.equal(sniffFileMime(JPEG), 'image/jpeg')
    assert.equal(sniffFileMime(PNG), 'image/png')
    assert.equal(sniffFileMime(text('GIF89a...')), 'image/gif')
    assert.equal(sniffFileMime(WEBP), 'image/webp')
    assert.equal(sniffFileMime(HEIC), 'image/heic')
    assert.equal(sniffFileMime(new Uint8Array([0, 0, 0, 0x1c, ...text('ftypavif')])), 'image/avif')
  })

  it('recognises the text formats that can carry script, whatever the client called them', () => {
    assert.equal(sniffFileMime(text('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>')), 'image/svg+xml')
    assert.equal(sniffFileMime(new Uint8Array([0xef, 0xbb, 0xbf, ...text('<?xml version="1.0"?>\n<svg/>')])), 'image/svg+xml')
    assert.equal(sniffFileMime(text('  <!DOCTYPE html><html>')), 'text/html')
    assert.equal(sniffFileMime(text('<script>alert(1)</script>')), 'text/html')
  })

  it('answers null for bytes it does not know — unknown is not safe', () => {
    assert.equal(sniffFileMime(new Uint8Array(0)), null)
    assert.equal(sniffFileMime(text('hello world')), null)
    assert.equal(sniffFileMime(bytes(0x00, 0x01, 0x02)), null)
    assert.equal(sniffFileMime(text('%PDF-1.7')), 'application/pdf')
  })
})

describe('decideUploadMime', () => {
  it('an image slot takes image bytes and records the sniffed type, not the declared one', () => {
    assert.deepEqual(decideUploadMime({ declaredType: 'image/png', resourceType: MediaResourceType.IMAGE, sniffed: 'image/jpeg' }), {
      ok: true,
      mime: 'image/jpeg',
    })
    assert.deepEqual(decideUploadMime({ declaredType: 'image/png', resourceType: undefined, sniffed: 'image/svg+xml' }), { ok: true, mime: 'image/svg+xml' })
  })

  it('an image slot refuses bytes that are not an image, even with an image type in the form', () => {
    assert.deepEqual(decideUploadMime({ declaredType: 'image/png', resourceType: MediaResourceType.IMAGE, sniffed: null }), {
      ok: false,
      reason: 'image_bytes_unknown',
    })
    assert.deepEqual(decideUploadMime({ declaredType: 'image/png', resourceType: MediaResourceType.IMAGE, sniffed: 'application/pdf' }), {
      ok: false,
      reason: 'image_bytes_unknown',
    })
    assert.deepEqual(decideUploadMime({ declaredType: 'image/png', resourceType: MediaResourceType.IMAGE, sniffed: 'text/html' }), {
      ok: false,
      reason: 'active_content',
    })
  })

  it('other slots keep the declared type but never take HTML or SVG', () => {
    assert.deepEqual(decideUploadMime({ declaredType: 'video/mp4', resourceType: MediaResourceType.VIDEO, sniffed: null }), { ok: true, mime: 'video/mp4' })
    assert.deepEqual(decideUploadMime({ declaredType: 'application/pdf', resourceType: MediaResourceType.DOCUMENT, sniffed: 'application/pdf' }), {
      ok: true,
      mime: 'application/pdf',
    })
    assert.deepEqual(decideUploadMime({ declaredType: 'video/mp4', resourceType: MediaResourceType.VIDEO, sniffed: 'text/html' }), {
      ok: false,
      reason: 'active_content',
    })
    assert.deepEqual(decideUploadMime({ declaredType: 'application/pdf', resourceType: MediaResourceType.DOCUMENT, sniffed: 'image/svg+xml' }), {
      ok: false,
      reason: 'active_content',
    })
  })
})

describe('isProviderMimeConsistent', () => {
  it('compares families and lets the provider refine within one', () => {
    assert.equal(isProviderMimeConsistent('image/heic', 'image/heif'), true)
    assert.equal(isProviderMimeConsistent('image/jpeg', 'image/jpeg'), true)
    assert.equal(isProviderMimeConsistent(null, 'image/jpeg'), true)
    assert.equal(isProviderMimeConsistent('image/jpeg', null), true)
  })

  it('flags a file the storage saw as something else', () => {
    assert.equal(isProviderMimeConsistent('image/png', 'text/html'), false)
    assert.equal(isProviderMimeConsistent('image/png', 'application/pdf'), false)
    assert.equal(isProviderMimeConsistent('image/png', 'image/svg+xml'), false)
    assert.equal(isProviderMimeConsistent('image/svg+xml', 'image/png'), false)
  })
})

describe('isRasterImageMime', () => {
  it('is true only for the raster set, never for SVG', () => {
    assert.equal(isRasterImageMime('image/png'), true)
    assert.equal(isRasterImageMime('image/svg+xml'), false)
    assert.equal(isRasterImageMime(null), false)
  })
})
