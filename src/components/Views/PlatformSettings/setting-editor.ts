import type { PlatformSettingModel, PlatformSettingSpec } from '~/api/platform-settings/model'

/** What the form holds: a checkbox state or the text in a field. */
export type SettingDraft = boolean | string

/** The draft a row starts with. A secret starts empty — its value never comes back from the server. */
export function draftOf(setting: Pick<PlatformSettingModel, 'spec' | 'value' | 'secret'>): SettingDraft {
  if (setting.secret) return ''

  switch (setting.spec.kind) {
    case 'boolean':
      return setting.value === true
    case 'int':
      return typeof setting.value === 'number' ? String(setting.value) : ''
    case 'textList':
      return Array.isArray(setting.value) ? setting.value.join('\n') : ''
    default:
      return typeof setting.value === 'string' ? setting.value : ''
  }
}

/**
 * The value sent to the server for a draft. Only the shape is decided here; the server validates
 * the rules (range, options, pattern) and answers with a code the row shows.
 */
export function valueOf(spec: PlatformSettingSpec, draft: SettingDraft): unknown {
  switch (spec.kind) {
    case 'boolean':
      return draft === true
    case 'int': {
      const text = String(draft).trim()

      return text === '' ? Number.NaN : Number(text)
    }
    case 'textList':
      return String(draft).split('\n')
    default:
      return String(draft)
  }
}

/** Whether the draft differs from what is stored — the Save button is idle otherwise. */
export function isDirty(setting: Pick<PlatformSettingModel, 'spec' | 'value' | 'secret'>, draft: SettingDraft): boolean {
  if (setting.secret) return draft !== ''

  return draft !== draftOf(setting)
}
