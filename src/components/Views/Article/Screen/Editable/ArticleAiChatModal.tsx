'use client'

/* eslint-disable simple-import-sort/imports -- react, @lib, ~/ */
import type { RefObject } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from 'react-query'
import { extractPlainTextFromRevisionContent } from '@lib/services/llm/extract-plain-text-from-revision-content'
import { BotIcon } from 'lucide-react'

import type { ArticleRevisionModel, ArticleRevisionSeoMetadata } from '~/api/article-revision'
import type { ContentSuggestResult, LlmTokenUsage, PreviewSuggestResult, SeoSuggestResult } from '~/api/llm'
import { ClientLlmApi } from '~/api/llm'
import { articleAuditToMarkdown } from '~/components/Views/Article/Screen/Editable/articleAuditToMarkdown'
import { ArticleAiChatAssistantMessage } from '~/components/Views/Article/Screen/Editable/ArticleAiChatAssistantMessage'
import type { ArticleEditableContentHandle } from '~/components/Views/Article/Screen/Editable/ArticleEditableContent'
import type { ArticleEditablePreviewHandle } from '~/components/Views/Article/Screen/Editable/ArticleEditablePreview'
import type { ArticleEditableSeoHandle } from '~/components/Views/Article/Screen/Editable/ArticleEditableSeo'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Textarea, Typography } from '~/components/ui'
import {
  buildLlmArticleAuditsQueryKey,
  buildLlmArticleUsageQueryKey,
  useArticleAuditMutation,
  useContentSuggestMutation,
  useLlmArticleAuditsQuery,
  useLlmChatHistoryQuery,
  useLlmModelsQuery,
  usePreviewSuggestMutation,
  useSeoSuggestMutation,
} from '~/query/llm'
import { useT } from '~/providers'
import { cn } from '~/utils/cn'
import { time } from '~/utils/time'
/* eslint-enable simple-import-sort/imports */

// eslint-disable-next-line react-refresh/only-export-components
export const isLlmUiEnabled = (): boolean => process.env.NEXT_PUBLIC_LLM_ENABLED === 'true'

type ChatRole = 'user' | 'assistant'

export type ChatTurn = { role: ChatRole; content: string }

type InnerTab = 'chat' | 'body'

type ShellTab = 'content' | 'seo' | 'preview' | 'audit'

type StreamEvent =
  | { type: 'start'; requestId: string }
  | { type: 'delta'; text: string }
  | { type: 'usage'; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }
  | { type: 'done'; requestId: string; durationMs: number; model: string }
  | { type: 'error'; message: string }

async function parseSseStream(res: Response, onEvent: (ev: StreamEvent) => void): Promise<void> {
  const reader = res.body?.getReader()

  if (!reader) {
    throw new Error('No response body')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() ?? ''

    for (const block of blocks) {
      const line = block.trim()

      if (!line.startsWith('data:')) {
        continue
      }

      const json = line.slice(5).trim()

      try {
        const parsed = JSON.parse(json) as StreamEvent

        onEvent(parsed)
      } catch {
        // ignore malformed chunk
      }
    }
  }
}

type Props = {
  articleId: string
  revisionId: string
  articleRevision: ArticleRevisionModel | null | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  seoEditorRef: RefObject<ArticleEditableSeoHandle | null>
  previewEditorRef: RefObject<ArticleEditablePreviewHandle | null>
  contentEditorRef: RefObject<ArticleEditableContentHandle | null>
}

type ApiErrorShape = { response?: { data?: { message?: string } } }

type SeoSuggestFormKeys = 'metaTitle' | 'metaDescription' | 'ogTitle' | 'ogDescription' | 'keywords'

function seoSuggestPickField(s: SeoSuggestResult, key: keyof SeoSuggestResult): Partial<Pick<ArticleRevisionSeoMetadata, SeoSuggestFormKeys>> {
  const v = s[key]

  if (typeof v !== 'string' || !v.trim()) {
    return {}
  }

  return { [key]: v } as Partial<Pick<ArticleRevisionSeoMetadata, SeoSuggestFormKeys>>
}

function seoSuggestToFullPartial(s: SeoSuggestResult): Partial<Pick<ArticleRevisionSeoMetadata, SeoSuggestFormKeys>> {
  const out: Partial<Pick<ArticleRevisionSeoMetadata, SeoSuggestFormKeys>> = {}

  ;(['metaTitle', 'metaDescription', 'ogTitle', 'ogDescription', 'keywords'] as const).forEach((key) => {
    Object.assign(out, seoSuggestPickField(s, key))
  })

  return out
}

export const ArticleAiChatModal = (props: Props) => {
  const { articleId, revisionId, articleRevision, open, onOpenChange, seoEditorRef, previewEditorRef, contentEditorRef } = props
  const t = useT()
  const [models, setModels] = useState<{ id: string; label: string }[]>([])
  const [serverLlmEnabled, setServerLlmEnabled] = useState(false)
  const [model, setModel] = useState('')
  const [messages, setMessages] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUsage, setLastUsage] = useState<{ promptTokens: number; completionTokens: number; totalTokens: number } | null>(null)
  const [auditError, setAuditError] = useState<string | null>(null)
  const [innerTab, setInnerTab] = useState<InnerTab>('chat')
  const [shellTab, setShellTab] = useState<ShellTab>('content')
  const [seoSuggest, setSeoSuggest] = useState<SeoSuggestResult | null>(null)
  const [previewSuggest, setPreviewSuggest] = useState<PreviewSuggestResult | null>(null)
  const [seoSuggestError, setSeoSuggestError] = useState<string | null>(null)
  const [previewSuggestError, setPreviewSuggestError] = useState<string | null>(null)
  const [lastSeoUsage, setLastSeoUsage] = useState<LlmTokenUsage | null>(null)
  const [lastPreviewUsage, setLastPreviewUsage] = useState<LlmTokenUsage | null>(null)
  const [bodySuggest, setBodySuggest] = useState<ContentSuggestResult | null>(null)
  const [bodySuggestError, setBodySuggestError] = useState<string | null>(null)
  const [lastBodyUsage, setLastBodyUsage] = useState<LlmTokenUsage | null>(null)
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const auditDetailRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const modelsQuery = useLlmModelsQuery(open)
  const historyFilter = open && articleId && revisionId ? { articleId, revisionId } : null
  const historyQuery = useLlmChatHistoryQuery(historyFilter, open)
  const articleAuditsQuery = useLlmArticleAuditsQuery(historyFilter, open)
  const { articleAuditMutation } = useArticleAuditMutation()
  const { seoSuggestMutation } = useSeoSuggestMutation()
  const { previewSuggestMutation } = usePreviewSuggestMutation()
  const { contentSuggestMutation } = useContentSuggestMutation()

  const structuredLoading = seoSuggestMutation.isLoading || previewSuggestMutation.isLoading || contentSuggestMutation.isLoading

  const auditLabels = useMemo(
    () => ({
      preview: t('article.ui.aiAuditSectionPreview'),
      content: t('article.ui.aiAuditSectionContent'),
      seo: t('article.ui.aiAuditSectionSeo'),
      overall: t('article.ui.aiAuditOverall'),
      strengths: t('article.ui.aiAuditStrengths'),
      issues: t('article.ui.aiAuditIssues'),
      recommendations: t('article.ui.aiAuditRecommendations'),
    }),
    [t],
  )

  const auditItems = useMemo(() => articleAuditsQuery.data?.items ?? [], [articleAuditsQuery.data?.items])

  const selectedAuditItem = useMemo(() => {
    if (!auditItems.length) {
      return null
    }

    if (selectedAuditId) {
      return auditItems.find((i) => i.id === selectedAuditId) ?? auditItems[0]
    }

    return auditItems[0]
  }, [auditItems, selectedAuditId])

  const auditMarkdown = selectedAuditItem ? articleAuditToMarkdown(selectedAuditItem.audit, auditLabels) : null

  const bodyPlain = useMemo(() => extractPlainTextFromRevisionContent(articleRevision?.content ?? ''), [articleRevision?.content])
  const isBodyWeak = bodyPlain.trim().length < 40

  useEffect(() => {
    if (!modelsQuery.data) {
      return
    }

    setServerLlmEnabled(modelsQuery.data.enabled)
    setModels(modelsQuery.data.chat.models)
    setModel((m) => m || modelsQuery.data!.chat.models[0]?.id || '')
  }, [modelsQuery.data])

  useEffect(() => {
    setSelectedAuditId(null)
    setAuditError(null)
    setInnerTab('chat')
    setShellTab('content')
    setSeoSuggest(null)
    setPreviewSuggest(null)
    setSeoSuggestError(null)
    setPreviewSuggestError(null)
    setLastSeoUsage(null)
    setLastPreviewUsage(null)
    setBodySuggest(null)
    setBodySuggestError(null)
    setLastBodyUsage(null)
  }, [revisionId])

  useEffect(() => {
    setMessages([])
  }, [revisionId])

  useEffect(() => {
    if (!historyQuery.data?.messages) {
      return
    }

    const loaded = historyQuery.data.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as ChatRole, content: m.content }))

    setMessages(loaded)
  }, [historyQuery.data])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, streaming])

  useEffect(() => {
    if (shellTab !== 'audit' || !auditMarkdown) {
      return
    }

    auditDetailRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [shellTab, selectedAuditItem?.id, auditMarkdown])

  const handleSend = useCallback(async () => {
    const text = input.trim()

    if (!text || streaming || !serverLlmEnabled) {
      return
    }

    const selectedModel = model || models[0]?.id

    if (!selectedModel) {
      setError(t('article.errors.llmNotConfigured'))

      return
    }

    const historyForApi: ChatTurn[] = [...messages, { role: 'user', content: text }]

    setInput('')
    setError(null)
    setStreaming(true)
    setLastUsage(null)
    setMessages([...historyForApi, { role: 'assistant', content: '' }])

    let assistantAcc = ''

    try {
      const api = new ClientLlmApi()
      const res = await api.postChatStream({
        articleId,
        revisionId,
        model: selectedModel,
        messages: historyForApi.map(({ role, content }) => ({ role, content })),
      })

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { message?: string }

        throw new Error(errBody.message || res.statusText)
      }

      await parseSseStream(res, (ev) => {
        if (ev.type === 'delta') {
          assistantAcc += ev.text
          setMessages((prev) => {
            const copy = [...prev]

            copy[copy.length - 1] = { role: 'assistant', content: assistantAcc }

            return copy
          })
        }

        if (ev.type === 'usage') {
          setLastUsage(ev.usage)
        }

        if (ev.type === 'error') {
          setError(ev.message)
        }
      })

      void queryClient.invalidateQueries(buildLlmArticleUsageQueryKey({ articleId, revisionId }))
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('errors.unknown')

      setError(msg)
      setMessages((prev) => prev.slice(0, -2))
    } finally {
      setStreaming(false)
    }
  }, [articleId, revisionId, input, messages, model, models, queryClient, serverLlmEnabled, streaming, t])

  const handleAudit = useCallback(async () => {
    if (articleAuditMutation.isLoading || streaming || !serverLlmEnabled) {
      return
    }

    const selectedModel = model || models[0]?.id

    if (!selectedModel) {
      setAuditError(t('article.errors.llmNotConfigured'))

      return
    }

    setAuditError(null)

    try {
      const body = await articleAuditMutation.mutateAsync({ articleId, revisionId, model: selectedModel })

      await queryClient.invalidateQueries(buildLlmArticleAuditsQueryKey({ articleId, revisionId }))
      void queryClient.invalidateQueries(buildLlmArticleUsageQueryKey({ articleId, revisionId }))
      const refetched = await articleAuditsQuery.refetch()

      if (body.savedId) {
        setSelectedAuditId(body.savedId)
      } else if (refetched.data?.items?.[0]) {
        setSelectedAuditId(refetched.data.items[0].id)
      }

      setShellTab('audit')
    } catch (e) {
      const err = e as ApiErrorShape
      const msg = err.response?.data?.message ?? (e instanceof Error ? e.message : t('errors.unknown'))

      setAuditError(msg)
    }
  }, [articleId, revisionId, articleAuditMutation, queryClient, articleAuditsQuery, streaming, serverLlmEnabled, model, models, t])

  const seoSuggestFieldLabels = useMemo(
    () => ({
      metaTitle: t('article.ui.metaTitle'),
      metaDescription: t('article.ui.metaDescription'),
      ogTitle: t('article.ui.ogTitle'),
      ogDescription: t('article.ui.ogDescription'),
      keywords: t('article.ui.metaKeywordsOptional'),
    }),
    [t],
  )

  const handleSeoSuggestRun = useCallback(async () => {
    if (seoSuggestMutation.isLoading || streaming || !serverLlmEnabled) {
      return
    }

    const selectedModel = model || models[0]?.id

    if (!selectedModel) {
      setSeoSuggestError(t('article.errors.llmNotConfigured'))

      return
    }

    setSeoSuggestError(null)

    try {
      const body = await seoSuggestMutation.mutateAsync({ articleId, revisionId, model: selectedModel })

      setSeoSuggest(body.suggest)
      setLastSeoUsage(body.usage ?? null)
      void queryClient.invalidateQueries(buildLlmArticleUsageQueryKey({ articleId, revisionId }))
    } catch (e) {
      const err = e as ApiErrorShape

      setSeoSuggestError(err.response?.data?.message ?? (e instanceof Error ? e.message : t('errors.unknown')))
    }
  }, [articleId, revisionId, model, models, queryClient, seoSuggestMutation, serverLlmEnabled, streaming, t])

  const handlePreviewSuggestRun = useCallback(async () => {
    if (previewSuggestMutation.isLoading || streaming || !serverLlmEnabled) {
      return
    }

    const selectedModel = model || models[0]?.id

    if (!selectedModel) {
      setPreviewSuggestError(t('article.errors.llmNotConfigured'))

      return
    }

    setPreviewSuggestError(null)

    try {
      const body = await previewSuggestMutation.mutateAsync({ articleId, revisionId, model: selectedModel })

      setPreviewSuggest(body.suggest)
      setLastPreviewUsage(body.usage ?? null)
      void queryClient.invalidateQueries(buildLlmArticleUsageQueryKey({ articleId, revisionId }))
    } catch (e) {
      const err = e as ApiErrorShape

      setPreviewSuggestError(err.response?.data?.message ?? (e instanceof Error ? e.message : t('errors.unknown')))
    }
  }, [articleId, revisionId, model, models, queryClient, previewSuggestMutation, serverLlmEnabled, streaming, t])

  const handleContentSuggestRun = useCallback(async () => {
    if (contentSuggestMutation.isLoading || streaming || !serverLlmEnabled) {
      return
    }

    const selectedModel = model || models[0]?.id

    if (!selectedModel) {
      setBodySuggestError(t('article.errors.llmNotConfigured'))

      return
    }

    setBodySuggestError(null)

    try {
      const body = await contentSuggestMutation.mutateAsync({ articleId, revisionId, model: selectedModel })

      setBodySuggest(body.suggest)
      setLastBodyUsage(body.usage ?? null)
      void queryClient.invalidateQueries(buildLlmArticleUsageQueryKey({ articleId, revisionId }))
    } catch (e) {
      const err = e as ApiErrorShape

      setBodySuggestError(err.response?.data?.message ?? (e instanceof Error ? e.message : t('errors.unknown')))
    }
  }, [articleId, revisionId, model, models, queryClient, contentSuggestMutation, serverLlmEnabled, streaming, t])

  const handleApplyBodyMarkdown = useCallback(() => {
    if (!bodySuggest?.markdown) {
      return
    }

    setBodySuggestError(null)

    const ok = contentEditorRef.current?.applyMarkdown(bodySuggest.markdown)

    if (!ok) {
      setBodySuggestError(t('article.errors.aiContentApplyFailed'))
    }
  }, [bodySuggest, contentEditorRef, t])

  const historyLoading = historyQuery.isLoading
  const auditLoading = articleAuditMutation.isLoading
  const auditsLoading = articleAuditsQuery.isLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] min-w-[85vw] w-full max-w-4xl flex-col gap-3 p-4 sm:p-6">
        <DialogHeader className="flex flex-row items-center gap-2 text-left">
          <BotIcon className="size-5 shrink-0" />
          <DialogTitle>
            <Typography variant="heading-3">{t('article.ui.aiChatTitle')}</Typography>
          </DialogTitle>
        </DialogHeader>

        {!serverLlmEnabled ? (
          <AlertInline message={t('article.errors.llmNotConfigured')} />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                {t('article.ui.aiModel')}
                <select
                  className={cn(
                    'rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70',
                  )}
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={streaming || auditLoading || structuredLoading}
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap gap-1 rounded-md border border-border bg-muted/30 p-1">
                <button
                  type="button"
                  className={cn(
                    'min-w-0 flex-1 rounded-sm px-2 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm',
                    shellTab === 'content' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setShellTab('content')}
                >
                  {t('article.ui.aiShellContent')}
                </button>
                <button
                  type="button"
                  className={cn(
                    'min-w-0 flex-1 rounded-sm px-2 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm',
                    shellTab === 'seo' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setShellTab('seo')}
                >
                  {t('article.ui.aiShellSeo')}
                </button>
                <button
                  type="button"
                  className={cn(
                    'min-w-0 flex-1 rounded-sm px-2 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm',
                    shellTab === 'preview' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setShellTab('preview')}
                >
                  {t('article.ui.aiShellPreview')}
                </button>
                <button
                  type="button"
                  className={cn(
                    'min-w-0 flex-1 rounded-sm px-2 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm',
                    shellTab === 'audit' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setShellTab('audit')}
                >
                  {t('article.ui.aiShellAudit')}
                  {auditItems.length > 0 ? <span className="ml-1 tabular-nums text-muted-foreground">({auditItems.length})</span> : null}
                </button>
              </div>
            </div>

            {shellTab === 'content' && (
              <>
                {isBodyWeak ? <AlertInline message={t('article.ui.aiEmptyBodyHint')} /> : null}

                <div className="flex gap-1 rounded-md border border-border bg-muted/30 p-1">
                  <button
                    type="button"
                    className={cn(
                      'flex-1 rounded-sm px-3 py-2 text-sm font-medium transition-colors',
                      innerTab === 'chat' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    )}
                    onClick={() => setInnerTab('chat')}
                  >
                    {t('article.ui.aiTabChat')}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'flex-1 rounded-sm px-3 py-2 text-sm font-medium transition-colors',
                      innerTab === 'body' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    )}
                    onClick={() => setInnerTab('body')}
                  >
                    {t('article.ui.aiTabBody')}
                  </button>
                </div>

                {innerTab === 'chat' ? (
                  <>
                    <div
                      ref={scrollRef}
                      className="min-h-[220px] max-h-[min(52vh,520px)] overflow-y-auto rounded-md border border-border bg-muted/30 p-3 text-sm"
                    >
                      {historyLoading && messages.length === 0 ? (
                        <Typography variant="Body/S/Regular" className="text-muted-foreground">
                          {t('article.ui.aiHistoryLoading')}
                        </Typography>
                      ) : messages.length === 0 ? (
                        <Typography variant="Body/S/Regular" className="text-muted-foreground">
                          {t('article.ui.aiChatEmpty')}
                        </Typography>
                      ) : (
                        messages.map((m, i) => {
                          const isLast = i === messages.length - 1
                          const isAssistantStreaming = streaming && isLast && m.role === 'assistant'

                          if (m.role === 'user') {
                            return (
                              <div key={`${i}-user`} className="mb-4 rounded-md border border-border/80 bg-muted/40 px-3 py-2 text-sm text-foreground">
                                <span className="font-semibold">{t('article.ui.aiYou')}</span>
                                <div className="mt-1 whitespace-pre-wrap">{m.content}</div>
                              </div>
                            )
                          }

                          if (!m.content.trim() && isAssistantStreaming) {
                            return (
                              <div key={`${i}-assistant`} className="mb-4 flex flex-col gap-2">
                                <span className="text-sm font-semibold text-muted-foreground">{t('article.ui.aiAssistant')}</span>
                                <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-4 text-center">
                                  <Typography variant="Body/S/Regular" className="text-muted-foreground">
                                    …
                                  </Typography>
                                </div>
                              </div>
                            )
                          }

                          return (
                            <div key={`${i}-assistant`} className="mb-4 flex flex-col gap-2">
                              <span className="text-sm font-semibold text-muted-foreground">{t('article.ui.aiAssistant')}</span>
                              <ArticleAiChatAssistantMessage content={m.content} />
                            </div>
                          )
                        })
                      )}
                    </div>

                    {error ? <AlertInline message={error} destructive /> : null}

                    {lastUsage ? (
                      <Typography variant="Body/XS/Regular" className="text-muted-foreground">
                        {t('article.ui.aiUsage', {
                          total: lastUsage.totalTokens,
                          prompt: lastUsage.promptTokens,
                          completion: lastUsage.completionTokens,
                        })}
                      </Typography>
                    ) : null}

                    <div className="flex flex-col gap-2">
                      <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={t('article.ui.aiChatPlaceholder')}
                        rows={3}
                        disabled={streaming}
                        name="ai-chat-input"
                        className="resize-y"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            void handleSend()
                          }
                        }}
                      />
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={streaming}>
                          {t('common.close')}
                        </Button>
                        <Button type="button" onClick={() => void handleSend()} disabled={streaming || !input.trim()}>
                          {streaming ? t('article.ui.aiSending') : t('article.ui.aiSend')}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-3 sm:min-h-[min(40vh,400px)]">
                    <AlertInline message={t('article.ui.aiBodySuggestReplaceWarning')} />
                    <Typography variant="Body/S/Regular" className="text-muted-foreground">
                      {t('article.ui.aiBodySuggestIntro')}
                    </Typography>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="secondary" onClick={() => void handleContentSuggestRun()} disabled={streaming || structuredLoading}>
                        {contentSuggestMutation.isLoading ? t('article.ui.aiStructuredGenerating') : t('article.ui.aiBodySuggestGenerate')}
                      </Button>
                      <Button type="button" onClick={() => handleApplyBodyMarkdown()} disabled={!bodySuggest?.markdown}>
                        {t('article.ui.aiBodySuggestApply')}
                      </Button>
                    </div>
                    {bodySuggestError ? <AlertInline message={bodySuggestError} destructive /> : null}
                    {lastBodyUsage ? (
                      <Typography variant="Body/XS/Regular" className="text-muted-foreground">
                        {t('article.ui.aiUsage', {
                          total: lastBodyUsage.totalTokens,
                          prompt: lastBodyUsage.promptTokens,
                          completion: lastBodyUsage.completionTokens,
                        })}
                      </Typography>
                    ) : null}
                    <div className="max-h-[min(55vh,520px)] min-h-[160px] overflow-y-auto rounded-md border border-border bg-muted/15 p-3">
                      {!bodySuggest ? (
                        <Typography variant="Body/S/Regular" className="text-muted-foreground">
                          {t('article.ui.aiBodySuggestEmpty')}
                        </Typography>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {bodySuggest.rationale ? (
                            <Typography variant="Body/XS/Regular" className="italic text-muted-foreground">
                              {bodySuggest.rationale}
                            </Typography>
                          ) : null}
                          <pre className="whitespace-pre-wrap break-words font-mono text-xs text-foreground">{bodySuggest.markdown}</pre>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                        {t('common.close')}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {shellTab === 'audit' && (
              <div className="flex min-h-0 flex-1 flex-col gap-3 sm:min-h-[min(60vh,560px)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Typography variant="Body/S/Semibold" className="text-foreground">
                    {t('article.ui.aiAuditResultTitle')}
                  </Typography>
                  <Button type="button" variant="secondary" onClick={() => void handleAudit()} disabled={streaming || auditLoading}>
                    {auditLoading ? t('article.ui.aiAuditing') : t('article.ui.aiAuditArticle')}
                  </Button>
                </div>

                {auditError ? <AlertInline message={auditError} destructive /> : null}

                <div className="flex min-h-0 flex-1 flex-col gap-2 sm:flex-row sm:gap-3">
                  <div
                    className={cn(
                      'flex max-h-[min(48vh,480px)] shrink-0 flex-col overflow-hidden rounded-md border border-border bg-muted/20 sm:max-h-none sm:w-52 sm:max-w-[40%]',
                    )}
                  >
                    <div className="border-b border-border px-2 py-2">
                      <Typography variant="Body/XS/Regular" className="text-muted-foreground">
                        {t('article.ui.aiTabAudits')}
                      </Typography>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto p-2">
                      {auditsLoading && auditItems.length === 0 ? (
                        <Typography variant="Body/S/Regular" className="text-muted-foreground">
                          {t('article.ui.aiHistoryLoading')}
                        </Typography>
                      ) : auditItems.length === 0 ? (
                        <Typography variant="Body/S/Regular" className="text-muted-foreground">
                          {t('article.ui.aiAuditListEmpty')}
                        </Typography>
                      ) : (
                        <ul className="flex flex-col gap-1">
                          {auditItems.map((item) => {
                            const isSelected = selectedAuditItem?.id === item.id
                            const label = time(item.createdAt).format('DD.MM.YYYY HH:mm')

                            return (
                              <li key={item.id}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedAuditId(item.id)}
                                  className={cn(
                                    'w-full rounded-md border px-2 py-2 text-left text-sm transition-colors',
                                    isSelected
                                      ? 'border-primary/60 bg-primary/10 text-foreground'
                                      : 'border-transparent bg-muted/40 text-foreground hover:bg-muted/70',
                                  )}
                                >
                                  <div className="font-medium leading-tight">{label}</div>
                                  <div className="mt-0.5 truncate text-xs text-muted-foreground">{item.model}</div>
                                  {item.usage ? (
                                    <div className="mt-1 text-xs text-muted-foreground">
                                      {t('article.ui.aiAuditListTokens', { total: item.usage.totalTokens })}
                                    </div>
                                  ) : null}
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div
                    ref={auditDetailRef}
                    className="min-h-[200px] min-w-0 flex-1 overflow-y-auto rounded-md border border-border bg-muted/15 p-3 sm:max-h-none sm:max-h-[min(60vh,560px)]"
                  >
                    {auditMarkdown ? (
                      <ArticleAiChatAssistantMessage content={auditMarkdown} />
                    ) : (
                      <Typography variant="Body/S/Regular" className="text-muted-foreground">
                        {t('article.ui.aiAuditListEmpty')}
                      </Typography>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                    {t('common.close')}
                  </Button>
                </div>
              </div>
            )}

            {shellTab === 'seo' && (
              <div className="flex flex-col gap-3 sm:min-h-[min(40vh,400px)]">
                <Typography variant="Body/S/Regular" className="text-muted-foreground">
                  {t('article.ui.aiSeoSuggestIntro')}
                </Typography>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => void handleSeoSuggestRun()} disabled={streaming || structuredLoading}>
                    {seoSuggestMutation.isLoading ? t('article.ui.aiStructuredGenerating') : t('article.ui.aiSeoSuggestGenerate')}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!seoSuggest) {
                        return
                      }

                      seoEditorRef.current?.applyPartial(seoSuggestToFullPartial(seoSuggest))
                    }}
                    disabled={!seoSuggest || Object.keys(seoSuggestToFullPartial(seoSuggest)).length === 0}
                  >
                    {t('article.ui.aiSuggestApplyAll')}
                  </Button>
                </div>
                {seoSuggestError ? <AlertInline message={seoSuggestError} destructive /> : null}
                {lastSeoUsage ? (
                  <Typography variant="Body/XS/Regular" className="text-muted-foreground">
                    {t('article.ui.aiUsage', {
                      total: lastSeoUsage.totalTokens,
                      prompt: lastSeoUsage.promptTokens,
                      completion: lastSeoUsage.completionTokens,
                    })}
                  </Typography>
                ) : null}
                <div className="max-h-[min(55vh,520px)] min-h-[160px] overflow-y-auto rounded-md border border-border bg-muted/15 p-3">
                  {!seoSuggest ? (
                    <Typography variant="Body/S/Regular" className="text-muted-foreground">
                      {t('article.ui.aiSeoSuggestEmpty')}
                    </Typography>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {(['metaTitle', 'metaDescription', 'ogTitle', 'ogDescription', 'keywords'] as const).map((key) => {
                        const val = seoSuggest[key]

                        if (typeof val !== 'string' || !val.trim()) {
                          return null
                        }

                        return (
                          <div key={key} className="flex flex-col gap-2 rounded-md border border-border/80 bg-muted/20 p-3">
                            <Typography variant="Body/XS/Regular" className="text-muted-foreground">
                              {seoSuggestFieldLabels[key]}
                            </Typography>
                            <Typography variant="Body/S/Regular" className="whitespace-pre-wrap">
                              {val}
                            </Typography>
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => seoEditorRef.current?.applyPartial(seoSuggestPickField(seoSuggest, key))}
                              >
                                {t('article.ui.aiSuggestApplyField')}
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                    {t('common.close')}
                  </Button>
                </div>
              </div>
            )}

            {shellTab === 'preview' && (
              <div className="flex flex-col gap-3 sm:min-h-[min(40vh,400px)]">
                <Typography variant="Body/S/Regular" className="text-muted-foreground">
                  {t('article.ui.aiPreviewSuggestIntro')}
                </Typography>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => void handlePreviewSuggestRun()} disabled={streaming || structuredLoading}>
                    {previewSuggestMutation.isLoading ? t('article.ui.aiStructuredGenerating') : t('article.ui.aiPreviewSuggestGenerate')}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!previewSuggest) {
                        return
                      }

                      previewEditorRef.current?.applyPartial({
                        ...(previewSuggest.title ? { title: previewSuggest.title } : {}),
                        ...(previewSuggest.description ? { description: previewSuggest.description } : {}),
                      })
                    }}
                    disabled={!previewSuggest || (!previewSuggest.title && !previewSuggest.description)}
                  >
                    {t('article.ui.aiSuggestApplyAll')}
                  </Button>
                </div>
                {previewSuggestError ? <AlertInline message={previewSuggestError} destructive /> : null}
                {lastPreviewUsage ? (
                  <Typography variant="Body/XS/Regular" className="text-muted-foreground">
                    {t('article.ui.aiUsage', {
                      total: lastPreviewUsage.totalTokens,
                      prompt: lastPreviewUsage.promptTokens,
                      completion: lastPreviewUsage.completionTokens,
                    })}
                  </Typography>
                ) : null}
                <div className="max-h-[min(55vh,520px)] min-h-[160px] overflow-y-auto rounded-md border border-border bg-muted/15 p-3">
                  {!previewSuggest ? (
                    <Typography variant="Body/S/Regular" className="text-muted-foreground">
                      {t('article.ui.aiPreviewSuggestEmpty')}
                    </Typography>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {previewSuggest.title ? (
                        <div className="flex flex-col gap-2 rounded-md border border-border/80 bg-muted/20 p-3">
                          <Typography variant="Body/XS/Regular" className="text-muted-foreground">
                            {t('article.ui.articleTitle')}
                          </Typography>
                          <Typography variant="Body/S/Regular" className="whitespace-pre-wrap">
                            {previewSuggest.title}
                          </Typography>
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => previewEditorRef.current?.applyPartial({ title: previewSuggest.title })}
                            >
                              {t('article.ui.aiSuggestApplyField')}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                      {previewSuggest.description ? (
                        <div className="flex flex-col gap-2 rounded-md border border-border/80 bg-muted/20 p-3">
                          <Typography variant="Body/XS/Regular" className="text-muted-foreground">
                            {t('article.ui.articleDescription')}
                          </Typography>
                          <Typography variant="Body/S/Regular" className="whitespace-pre-wrap">
                            {previewSuggest.description}
                          </Typography>
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => previewEditorRef.current?.applyPartial({ description: previewSuggest.description })}
                            >
                              {t('article.ui.aiSuggestApplyField')}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                      {previewSuggest.rationale ? (
                        <Typography variant="Body/XS/Regular" className="italic text-muted-foreground">
                          {previewSuggest.rationale}
                        </Typography>
                      ) : null}
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                    {t('common.close')}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

const AlertInline = (props: { message: string; destructive?: boolean }) => (
  <div
    className={cn('rounded-md border px-3 py-2 text-sm', {
      'border-destructive/50 bg-destructive/10 text-destructive': props.destructive,
      'border-border bg-muted/50 text-foreground': !props.destructive,
    })}
  >
    {props.message}
  </div>
)
