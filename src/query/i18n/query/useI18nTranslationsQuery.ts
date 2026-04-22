import { ClientI18nApi, type I18nTranslationListResponse } from '~/api/i18n'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'

export const I18N_TRANSLATIONS_QUERY_KEY = 'i18n-translations'

export const fetchI18nTranslations = (localeCode: string) => async (): Promise<I18nTranslationListResponse> => {
  const api = new ClientI18nApi()

  return api.getTranslations(localeCode)
}

export const useI18nTranslationsQuery = (localeCode: string, enabled = true) => {
  return useQueryBuilder({
    key: [I18N_TRANSLATIONS_QUERY_KEY, localeCode].join('-'),
    enabled: Boolean(localeCode) && enabled,
    method: fetchI18nTranslations(localeCode),
  })
}
