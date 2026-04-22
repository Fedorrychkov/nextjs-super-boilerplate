import connectDB from '@lib/db/client'
import I18nTranslationOverride from '@lib/db/models/I18nTranslationOverride'

import type { AppLocale } from './config'
import type { I18nOverrideMap } from './getT'

/**
 * Best-effort DB overrides for runtime translations.
 * Never throws: falls back to empty map if DB is unavailable.
 */
export async function getLocaleOverrides(locale: AppLocale | null | undefined): Promise<I18nOverrideMap> {
  const localeCode = String(locale ?? '').trim()

  if (!localeCode) {
    return {}
  }

  try {
    await connectDB()
    const rows = await I18nTranslationOverride.find({ localeCode }).select('key value').lean()
    const out: I18nOverrideMap = {}

    for (const row of rows) {
      const key = String(row.key ?? '').trim()

      if (!key) {
        continue
      }

      out[key] = String(row.value ?? '')
    }

    return out
  } catch {
    return {}
  }
}
