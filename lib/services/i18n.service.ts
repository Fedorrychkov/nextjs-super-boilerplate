import connectDB from '@lib/db/client'
import I18nLocale from '@lib/db/models/I18nLocale'
import I18nTranslationOverride from '@lib/db/models/I18nTranslationOverride'
import { ValidationError } from '@lib/error/custom-errors'

import type {
  I18nCreateLocaleDto,
  I18nLocaleModel,
  I18nTranslationEntryModel,
  I18nTranslationListResponse,
  I18nTranslationOverrideModel,
  I18nUpsertTranslationDto,
} from '~/api/i18n'
import { SUPPORTED_LOCALES, SystemLocale } from '~/lib/i18n/config'
import { getMessages } from '~/lib/i18n/getT'
import { getEnMessageKeys, getEnMessageValueByKey, getMessageValueByKey, isKnownMessageKey } from '~/lib/i18n/messageKeys'

function localeDocToModel(doc: any): I18nLocaleModel {
  return {
    id: doc._id.toString(),
    code: String(doc.code ?? ''),
    label: doc.label ?? null,
    isSystem: Boolean(doc.isSystem),
    isActive: Boolean(doc.isActive),
    createdAt: doc.createdAt ?? null,
    updatedAt: doc.updatedAt ?? null,
  }
}

function overrideDocToModel(doc: any): I18nTranslationOverrideModel {
  return {
    id: doc._id.toString(),
    localeCode: String(doc.localeCode ?? ''),
    key: String(doc.key ?? ''),
    value: String(doc.value ?? ''),
    updatedByUserId: doc.updatedByUserId ?? null,
    createdAt: doc.createdAt ?? null,
    updatedAt: doc.updatedAt ?? null,
  }
}

function normalizeLocaleCode(value: string | null | undefined): string {
  const t = String(value ?? '').trim()

  if (!t) return ''

  return t
}

export class I18nService {
  async listLocales(): Promise<I18nLocaleModel[]> {
    await connectDB()
    const list = await I18nLocale.find({}).sort({ isSystem: -1, code: 1 }).lean()

    return list.map(localeDocToModel)
  }

  /**
   * Lowercased locale codes allowed for cookie / Accept-Language resolution:
   * {@link SUPPORTED_LOCALES} (repo message files) ∪ active rows in `I18nLocale`.
   */
  async getResolvableLocaleCodesForDetection(): Promise<ReadonlySet<string>> {
    const set = new Set<string>()

    for (const code of SUPPORTED_LOCALES) {
      set.add(String(code).toLowerCase())
    }

    try {
      const list = await this.listLocales()

      for (const l of list) {
        if (!l.isActive) continue

        const c = normalizeLocaleCode(l.code)

        if (c) set.add(c.toLowerCase())
      }
    } catch {
      // No DB (tests) or transient failure — file-backed locales only.
    }

    return set
  }

  /**
   * Ensures every locale listed in SUPPORTED_LOCALES (file-backed bundles in repo) has a row in I18nLocale.
   * Does not copy translation strings — only locale metadata for the admin UI.
   */
  async syncLocalesFromCodeFiles(): Promise<I18nLocaleModel[]> {
    await connectDB()

    for (const code of SUPPORTED_LOCALES) {
      await I18nLocale.findOneAndUpdate(
        { code },
        {
          $set: {
            isSystem: SUPPORTED_LOCALES?.includes(code),
            isActive: true,
          },
          $setOnInsert: {
            label: null,
          },
        },
        { upsert: true },
      )
    }

    return this.listLocales()
  }

  async createLocale(dto: I18nCreateLocaleDto): Promise<I18nLocaleModel> {
    await connectDB()

    const code = normalizeLocaleCode(dto.code)

    if (!code) {
      throw new ValidationError('Locale code is required')
    }

    const existing = await I18nLocale.findOne({ code }).lean()

    if (existing) {
      throw new ValidationError('Locale already exists')
    }

    const created = await I18nLocale.create({
      code,
      label: dto.label?.trim() || null,
      isSystem: code === 'en' || code === 'ru',
      isActive: true,
    })

    return localeDocToModel(created)
  }

  async listTranslations(localeCodeRaw: string): Promise<I18nTranslationListResponse> {
    await connectDB()

    const localeCode = normalizeLocaleCode(localeCodeRaw)

    if (!localeCode) {
      throw new ValidationError('Locale code is required')
    }

    const keys = getEnMessageKeys()
    const overrides = await I18nTranslationOverride.find({ localeCode, key: { $in: [...keys] } }).lean()
    const overrideMap = new Map(overrides.map((i) => [String(i.key), String(i.value ?? '')]))
    const fileLocaleMessages = SUPPORTED_LOCALES?.includes?.(localeCode as SystemLocale) ? getMessages(localeCode) : null

    const list: I18nTranslationEntryModel[] = keys.map((key) => {
      const baseEnValue = getEnMessageValueByKey(key) ?? ''
      const fileLocaleValue = fileLocaleMessages ? getMessageValueByKey(fileLocaleMessages, key) : null
      const dbOverrideValue = overrideMap.has(key) ? (overrideMap.get(key) ?? '') : null

      return {
        key,
        baseEnValue,
        fileLocaleValue,
        dbOverrideValue,
        effectiveValue: dbOverrideValue ?? fileLocaleValue ?? baseEnValue,
      }
    })

    return {
      localeCode,
      keysCount: list.length,
      list,
    }
  }

  async upsertTranslation(dto: I18nUpsertTranslationDto, updatedByUserId?: string | null): Promise<I18nTranslationOverrideModel | null> {
    await connectDB()

    const localeCode = normalizeLocaleCode(dto.localeCode)

    if (!localeCode) {
      throw new ValidationError('Locale code is required')
    }

    const key = String(dto.key ?? '').trim()

    if (!key || !isKnownMessageKey(key)) {
      throw new ValidationError('Unknown translation key')
    }

    await I18nLocale.updateOne(
      { code: localeCode },
      { $setOnInsert: { code: localeCode, isSystem: localeCode === 'en' || localeCode === 'ru', isActive: true } },
      { upsert: true },
    )

    const value = dto.value == null ? '' : String(dto.value)

    if (!value.trim()) {
      await I18nTranslationOverride.deleteOne({ localeCode, key })

      return null
    }

    const doc = await I18nTranslationOverride.findOneAndUpdate(
      { localeCode, key },
      { $set: { value, updatedByUserId: updatedByUserId ?? null } },
      { upsert: true, new: true },
    )

    return doc ? overrideDocToModel(doc) : null
  }
}
