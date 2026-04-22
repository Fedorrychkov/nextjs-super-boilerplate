import { Request } from '@lib/request'
import { AxiosInstance } from 'axios'

import { I18nLocaleModel } from '../model'
import type {
  I18nBatchUpsertTranslationsDto,
  I18nBatchUpsertTranslationsResponse,
  I18nCreateLocaleDto,
  I18nSyncLocalesFromFilesResponse,
  I18nTranslationListResponse,
  I18nUpsertTranslationDto,
  I18nUpsertTranslationResponse,
} from '../types'

export class ClientI18nApi {
  private readonly client: AxiosInstance

  constructor() {
    this.client = new Request().apiClient
  }

  async getLocales(): Promise<{ list: I18nLocaleModel[] }> {
    const response = await this.client.get('/api/v1/i18n/locales')

    return response.data
  }

  async createLocale(body: I18nCreateLocaleDto): Promise<I18nLocaleModel> {
    const response = await this.client.post('/api/v1/i18n/locales', body)

    return response.data
  }

  async syncLocalesFromFiles(): Promise<I18nSyncLocalesFromFilesResponse> {
    const response = await this.client.post('/api/v1/i18n/locales/sync-from-files')

    return response.data
  }

  async getTranslations(locale: string): Promise<I18nTranslationListResponse> {
    const response = await this.client.get('/api/v1/i18n/translations', { params: { locale } })

    return response.data
  }

  async upsertTranslation(body: I18nUpsertTranslationDto): Promise<I18nUpsertTranslationResponse> {
    const response = await this.client.put('/api/v1/i18n/translations', body)

    return response.data
  }

  async upsertTranslationsBatch(body: I18nBatchUpsertTranslationsDto): Promise<I18nBatchUpsertTranslationsResponse> {
    const response = await this.client.post('/api/v1/i18n/translations/batch', body)

    return response.data
  }
}
