import { useMutation, useQueryClient } from 'react-query'

import { ClientI18nApi, type I18nBatchUpsertTranslationsDto, type I18nCreateLocaleDto, type I18nUpsertTranslationDto } from '~/api/i18n'

import { I18N_LOCALES_QUERY_KEY } from '../query/useI18nLocalesQuery'
import { I18N_TRANSLATIONS_QUERY_KEY } from '../query/useI18nTranslationsQuery'

export const useI18nCreateLocaleMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: I18nCreateLocaleDto) => {
      const api = new ClientI18nApi()

      return api.createLocale(body)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries(I18N_LOCALES_QUERY_KEY)
    },
  })
}

export const useI18nSyncLocalesFromFilesMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const api = new ClientI18nApi()

      return api.syncLocalesFromFiles()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries(I18N_LOCALES_QUERY_KEY)
    },
  })
}

export const useI18nUpsertTranslationMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: I18nUpsertTranslationDto) => {
      const api = new ClientI18nApi()

      return api.upsertTranslation(body)
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries([I18N_TRANSLATIONS_QUERY_KEY, data.localeCode].join('-'))
    },
  })
}

export const useI18nUpsertTranslationsBatchMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: I18nBatchUpsertTranslationsDto) => {
      const api = new ClientI18nApi()

      return api.upsertTranslationsBatch(body)
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries([I18N_TRANSLATIONS_QUERY_KEY, data.localeCode].join('-'))
    },
  })
}
