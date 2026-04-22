import { ClientI18nApi, type I18nLocaleModel } from '~/api/i18n'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'

export const I18N_LOCALES_QUERY_KEY = 'i18n-locales'

export const fetchI18nLocales = () => async (): Promise<{ list: I18nLocaleModel[] }> => {
  const api = new ClientI18nApi()

  return api.getLocales()
}

export const useI18nLocalesQuery = (enabled = true) => {
  return useQueryBuilder({
    key: I18N_LOCALES_QUERY_KEY,
    enabled,
    method: fetchI18nLocales(),
  })
}
