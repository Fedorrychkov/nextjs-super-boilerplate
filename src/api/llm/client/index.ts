import { Request } from '@lib/request'
import { AxiosInstance } from 'axios'

import {
  ArticleAuditApiResponse,
  ArticleAuditListResponse,
  ContentSuggestApiResponse,
  LlmArticleUsageResponse,
  LlmChatHistoryResponse,
  LlmModelsResponse,
  LlmUsageDashboardResponse,
  PreviewSuggestApiResponse,
  SeoSuggestApiResponse,
} from '../model'
import {
  ArticleAuditDto,
  ContentSuggestDto,
  LlmArticleAuditListFilter,
  LlmArticleUsageFilter,
  LlmChatHistoryFilter,
  LlmChatStreamDto,
  LlmUsageDashboardFilter,
  PreviewSuggestDto,
  SeoSuggestDto,
} from '../types'

export class ClientLlmApi {
  private readonly client: AxiosInstance

  constructor(origin?: string, options?: { headers?: Record<string, string> }) {
    const config = origin ? { baseURL: origin, ...(options?.headers && { headers: options.headers }) } : undefined
    this.client = new Request(config).apiClient
  }

  async listModels(): Promise<LlmModelsResponse> {
    const response = await this.client.get<LlmModelsResponse>('/api/v1/llm/models')

    return response.data
  }

  async getUsageDashboard(filter?: LlmUsageDashboardFilter): Promise<LlmUsageDashboardResponse> {
    const response = await this.client.get<LlmUsageDashboardResponse>('/api/v1/llm/usage/dashboard', {
      params: { days: filter?.days },
    })

    return response.data
  }

  async getArticleUsage(filter: LlmArticleUsageFilter): Promise<LlmArticleUsageResponse> {
    const response = await this.client.get<LlmArticleUsageResponse>('/api/v1/llm/usage/article', {
      params: {
        articleId: filter.articleId,
        revisionId: filter.revisionId,
      },
    })

    return response.data
  }

  async getChatHistory(filter: LlmChatHistoryFilter): Promise<LlmChatHistoryResponse> {
    const response = await this.client.get<LlmChatHistoryResponse>('/api/v1/llm/chat/history', {
      params: {
        articleId: filter.articleId,
        revisionId: filter.revisionId,
      },
    })

    return response.data
  }

  async listArticleAudits(filter: LlmArticleAuditListFilter): Promise<ArticleAuditListResponse> {
    const response = await this.client.get<ArticleAuditListResponse>('/api/v1/llm/article-audit', {
      params: {
        articleId: filter.articleId,
        revisionId: filter.revisionId,
      },
    })

    return response.data
  }

  async postArticleAudit(dto: ArticleAuditDto): Promise<ArticleAuditApiResponse> {
    const response = await this.client.post<ArticleAuditApiResponse>('/api/v1/llm/article-audit', dto)

    return response.data
  }

  async postSeoSuggest(dto: SeoSuggestDto): Promise<SeoSuggestApiResponse> {
    const response = await this.client.post<SeoSuggestApiResponse>('/api/v1/llm/seo/suggest', dto)

    return response.data
  }

  async postPreviewSuggest(dto: PreviewSuggestDto): Promise<PreviewSuggestApiResponse> {
    const response = await this.client.post<PreviewSuggestApiResponse>('/api/v1/llm/preview/suggest', dto)

    return response.data
  }

  async postContentSuggest(dto: ContentSuggestDto): Promise<ContentSuggestApiResponse> {
    const response = await this.client.post<ContentSuggestApiResponse>('/api/v1/llm/content/suggest', dto)

    return response.data
  }

  /**
   * SSE stream; uses `fetch` because the browser ReadableStream API is required.
   * Same-origin relative URL; credentials match `Request` (withCredentials).
   */
  async postChatStream(dto: LlmChatStreamDto): Promise<Response> {
    return fetch('/api/v1/llm/chat/stream', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    })
  }
}
