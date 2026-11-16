import { MediaResourceType } from '~/api/media/model'

/** Bytes the sniffer needs; the caller slices at most this much from the file. */
export const SIGNATURE_HEAD_BYTES = 512

const RASTER_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/avif'])

const startsWith = (head: Uint8Array, bytes: number[], offset = 0): boolean => bytes.every((b, i) => head[offset + i] === b)

const ascii = (text: string): number[] => Array.from(text, (ch) => ch.charCodeAt(0))

/**
 * Type from the first bytes, not from the multipart `type` field the client typed in. Covers
 * what the upload field accepts for images plus the two text formats that carry script (SVG,
 * HTML); anything else is `null` — unknown, not "safe".
 */
export function sniffFileMime(head: Uint8Array): string | null {
  if (startsWith(head, [0xff, 0xd8, 0xff])) return 'image/jpeg'

  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'

  if (startsWith(head, ascii('GIF87a')) || startsWith(head, ascii('GIF89a'))) return 'image/gif'

  if (startsWith(head, ascii('RIFF')) && startsWith(head, ascii('WEBP'), 8)) return 'image/webp'

  if (startsWith(head, ascii('ftyp'), 4)) {
    const brand = String.fromCharCode(...head.slice(8, 12)).toLowerCase()

    if (brand === 'avif' || brand === 'avis') return 'image/avif'

    if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'heim', 'heis'].includes(brand)) return 'image/heic'
  }

  if (startsWith(head, ascii('%PDF-'))) return 'application/pdf'

  // TextDecoder drops a leading BOM by default (ignoreBOM: false).
  const text = new TextDecoder('utf-8', { fatal: false }).decode(head).trimStart().toLowerCase()

  if (text.startsWith('<svg') || (text.startsWith('<?xml') && text.includes('<svg'))) return 'image/svg+xml'

  if (text.startsWith('<!doctype html') || text.startsWith('<html') || text.includes('<script')) return 'text/html'

  return null
}

export type UploadMimeDecision = { ok: true; mime: string | null } | { ok: false; reason: 'image_bytes_unknown' | 'active_content' }

/**
 * What the upload route may accept. An image slot takes only bytes that are an image (raster or
 * SVG — SVG is served from the CDN origin, never from ours); any slot refuses HTML. Everything
 * else keeps the declared type: video, audio and documents have no signature list here, and
 * refusing them by guesswork would break real uploads.
 */
export function decideUploadMime(params: {
  declaredType: string | null
  resourceType: MediaResourceType | undefined
  sniffed: string | null
}): UploadMimeDecision {
  const declared = params.declaredType?.toLowerCase() ?? null
  const asImage = params.resourceType === MediaResourceType.IMAGE || (params.resourceType === undefined && Boolean(declared?.startsWith('image/')))

  if (params.sniffed === 'text/html') return { ok: false, reason: 'active_content' }

  if (asImage) {
    if (params.sniffed && (RASTER_IMAGE_MIMES.has(params.sniffed) || params.sniffed === 'image/svg+xml')) {
      return { ok: true, mime: params.sniffed }
    }

    return { ok: false, reason: 'image_bytes_unknown' }
  }

  if (params.sniffed === 'image/svg+xml' && params.resourceType !== undefined) {
    // SVG in a video/audio/document slot: the declared type is a lie either way.
    return { ok: false, reason: 'active_content' }
  }

  return { ok: true, mime: params.sniffed ?? declared }
}

/**
 * The storage reports the type it detected; when it disagrees with what we sniffed, the file is
 * not what the caller claimed and the asset must not be created. Families are compared, not
 * exact strings: the provider may say `image/heif` where we said `image/heic`.
 */
export function isProviderMimeConsistent(expected: string | null | undefined, actual: string | null | undefined): boolean {
  if (!expected || !actual) return true

  const family = (mime: string) => mime.toLowerCase().split('/')[0]

  if (family(expected) !== family(actual)) return false

  if (expected === 'image/svg+xml' || actual.toLowerCase() === 'image/svg+xml') {
    return expected.toLowerCase() === actual.toLowerCase()
  }

  return true
}

export function isRasterImageMime(mime: string | null | undefined): boolean {
  return Boolean(mime) && RASTER_IMAGE_MIMES.has(mime!.toLowerCase())
}
