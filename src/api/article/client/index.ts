import { Request } from '@lib/request'
import { AxiosInstance } from 'axios'

import { PaginationMeta } from '~/types'

import {
  ArticleListenAudioGenerateResponse,
  ArticleModel,
  ArticleTranslationCreateResponse,
  ArticleTranslationLinkResponse,
  ArticleTranslationPublishBatchResponse,
  ArticleTranslationRestorePublishedBatchResponse,
  ArticleTranslationSiblingsResponse,
  ArticleTranslationUnlinkResponse,
  ArticleTranslationUnpublishBatchResponse,
} from '../model'
import { ArticleFilter } from '../types'

export * from './publicArticleList'

export class ClientArticleApi {
  private readonly client: AxiosInstance

  constructor(origin?: string, options?: { headers?: Record<string, string> }) {
    const config = origin ? { baseURL: origin, ...(options?.headers && { headers: options.headers }) } : undefined
    this.client = new Request(config).apiClient
  }

  async getArticles(params: ArticleFilter): Promise<PaginationMeta<ArticleModel>> {
    const response = await this.client.get('/api/v1/article/list', { params })

    return response.data
  }

  async getArticle(id: string): Promise<ArticleModel> {
    const response = await this.client.get(`/api/v1/article/get/${id}`)

    return response.data
  }

  async getArticleBySlug(slug: string): Promise<ArticleModel> {
    const response = await this.client.get(`/api/v1/article/get-by-slug/${slug}`)

    return response.data
  }

  async getTranslationSiblings(articleId: string): Promise<ArticleTranslationSiblingsResponse> {
    const response = await this.client.get(`/api/v1/article/translation-siblings/${articleId}`)

    return response.data
  }

  async translationLink(body: { articleIds: string[]; translationGroupId?: string | null }): Promise<ArticleTranslationLinkResponse> {
    const response = await this.client.post('/api/v1/article/translation-link', body)

    return response.data
  }

  async translationUnlink(body: { articleIds: string[] }): Promise<ArticleTranslationUnlinkResponse> {
    const response = await this.client.post('/api/v1/article/translation-unlink', body)

    return response.data
  }

  async translationPublishBatch(body: { articleIds: string[] }): Promise<ArticleTranslationPublishBatchResponse> {
    const response = await this.client.post('/api/v1/article/translation-publish-batch', body)

    return response.data
  }

  async translationUnpublishBatch(body: { articleIds: string[] }): Promise<ArticleTranslationUnpublishBatchResponse> {
    const response = await this.client.post('/api/v1/article/translation-unpublish-batch', body)

    return response.data
  }

  async translationRestorePublishedBatch(body: { articleIds: string[] }): Promise<ArticleTranslationRestorePublishedBatchResponse> {
    const response = await this.client.post('/api/v1/article/translation-restore-published-batch', body)

    return response.data
  }

  async translationCreate(body: {
    sourceArticleId: string
    locale: string
    slug?: string | null
    sourceRevisionId?: string | null
  }): Promise<ArticleTranslationCreateResponse> {
    const response = await this.client.post('/api/v1/article/translation-create', body)

    return response.data
  }

  async createArticle(dto: Partial<ArticleModel>): Promise<ArticleModel> {
    const response = await this.client.post('/api/v1/article/create', dto)

    return response.data
  }

  async updateArticle(id: string, dto: Partial<ArticleModel>): Promise<ArticleModel> {
    const response = await this.client.put('/api/v1/article/update', { id, ...dto })

    return response.data
  }

  async generateListenAudio(dto: { articleId: string; voice?: string }): Promise<ArticleListenAudioGenerateResponse> {
    const response = await this.client.post<ArticleListenAudioGenerateResponse>('/api/v1/article/listen-audio/generate', dto)

    return response.data
  }
}
