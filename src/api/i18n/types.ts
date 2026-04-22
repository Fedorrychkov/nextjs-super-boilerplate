import type { I18nLocaleModel, I18nTranslationEntryModel, I18nTranslationOverrideModel } from './model'

export type I18nCreateLocaleDto = {
  code: string
  label?: string | null
}

export type I18nUpsertTranslationDto = {
  localeCode: string
  key: string
  value: string | null
}

export type I18nBatchUpsertTranslationsDto = {
  items: I18nUpsertTranslationDto[]
}

export type I18nLocalesResponse = {
  list: I18nLocaleModel[]
}

export type I18nSyncLocalesFromFilesResponse = I18nLocalesResponse & {
  syncedCodes: string[]
}

export type I18nTranslationListResponse = {
  localeCode: string
  keysCount: number
  list: I18nTranslationEntryModel[]
}

export type I18nUpsertTranslationResponse = {
  localeCode: string
  key: string
  saved: I18nTranslationOverrideModel | null
}

export type I18nBatchUpsertTranslationsResponse = {
  localeCode: string
  updatedCount: number
  list: Array<Pick<I18nUpsertTranslationResponse, 'key' | 'saved'>>
}
