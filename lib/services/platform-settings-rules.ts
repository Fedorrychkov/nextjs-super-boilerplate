import type { PlatformSettingSpec } from '~/api/platform-settings/model'

/** A code, not a sentence: the admin turns it into text in the reader's language next to the field. */
export type SettingErrorCode =
  | 'notBoolean'
  | 'notInteger'
  | 'outOfRange'
  | 'notAnOption'
  | 'notText'
  | 'tooLong'
  | 'patternMismatch'
  | 'notList'
  | 'tooManyItems'
  | 'itemTooLong'

export type SettingCheck = { ok: true; value: unknown } | { ok: false; code: SettingErrorCode }

/** Validate a value from the admin by its spec; text is trimmed, a list loses empty lines. */
export function validateSettingValue(spec: PlatformSettingSpec, value: unknown): SettingCheck {
  switch (spec.kind) {
    case 'boolean':
      return typeof value === 'boolean' ? { ok: true, value } : { ok: false, code: 'notBoolean' }

    case 'int':
      if (typeof value !== 'number' || !Number.isInteger(value)) return { ok: false, code: 'notInteger' }

      return value < spec.min || value > spec.max ? { ok: false, code: 'outOfRange' } : { ok: true, value }

    case 'choice':
      return typeof value === 'string' && spec.options.includes(value) ? { ok: true, value } : { ok: false, code: 'notAnOption' }

    case 'text': {
      if (typeof value !== 'string') return { ok: false, code: 'notText' }

      const text = value.trim()

      if (text.length > spec.maxLength) return { ok: false, code: 'tooLong' }

      // An empty value means "not set" and is always allowed; the pattern applies to a real value.
      if (text && spec.pattern && !new RegExp(spec.pattern).test(text)) return { ok: false, code: 'patternMismatch' }

      return { ok: true, value: text }
    }

    case 'textList': {
      if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) return { ok: false, code: 'notList' }

      const items = (value as string[]).map((item) => item.trim()).filter(Boolean)

      if (items.length > spec.maxItems) return { ok: false, code: 'tooManyItems' }

      if (items.some((item) => item.length > spec.maxLength)) return { ok: false, code: 'itemTooLong' }

      return { ok: true, value: items }
    }
  }
}

/**
 * The value the product uses. A stored value that no longer passes (the rule was narrowed in a new
 * version) must not break the product: the default applies.
 */
export function effectiveSettingValue<T>(spec: PlatformSettingSpec, defaultValue: T, stored: unknown): T {
  if (stored === undefined || stored === null) return defaultValue

  const checked = validateSettingValue(spec, stored)

  return checked.ok ? (checked.value as T) : defaultValue
}
