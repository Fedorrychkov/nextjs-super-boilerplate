export type I18nLocaleModel = {
  id: string
  code: string
  label?: string | null
  isSystem: boolean
  isActive: boolean
  createdAt?: string | null
  updatedAt?: string | null
}

export type I18nTranslationOverrideModel = {
  id: string
  localeCode: string
  key: string
  value: string
  updatedByUserId?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type I18nTranslationEntryModel = {
  key: string
  baseEnValue: string
  fileLocaleValue?: string | null
  dbOverrideValue?: string | null
  effectiveValue: string
}
