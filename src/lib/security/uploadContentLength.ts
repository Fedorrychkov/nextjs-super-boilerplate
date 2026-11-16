export type ContentLengthVerdict = 'within' | 'too_large' | 'unknown'

/** multipart adds boundaries and part headers on top of the file bytes. */
export const MULTIPART_OVERHEAD_BYTES = 64 * 1024

/**
 * Decides from `Content-Length` alone whether a request body is worth reading. `formData()`
 * buffers the whole body before any size check in the handler can run, so the check has to
 * happen here, on the header. A body without a usable length is `unknown`: the caller keeps
 * the old path (nginx caps it), it is not refused.
 */
export function checkContentLength(
  headers: { get(name: string): string | null },
  maxBytes: number,
  overheadBytes: number = MULTIPART_OVERHEAD_BYTES,
): ContentLengthVerdict {
  const raw = headers.get('content-length')

  if (raw === null || raw.trim() === '') return 'unknown'

  const value = Number(raw)

  if (!Number.isFinite(value) || value < 0) return 'unknown'

  return value <= maxBytes + overheadBytes ? 'within' : 'too_large'
}
