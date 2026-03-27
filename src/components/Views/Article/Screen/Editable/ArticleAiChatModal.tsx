'use client'

/* eslint-disable simple-import-sort/imports -- react, @lib, ~/ */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from 'react-query'
import { extractPlainTextFromRevisionContent } from '@lib/services/llm/extract-plain-text-from-revision-content'
import { BotIcon } from 'lucide-react'

import { ClientLlmApi } from '~/api/llm'
import type { ArticleRevisionModel } from '~/api/article-revision'
import { articleAuditToMarkdown } from '~/components/Views/Article/Screen/Editable/articleAuditToMarkdown'
import { ArticleAiChatAssistantMessage } from '~/components/Views/Article/Screen/Editable/ArticleAiChatAssistantMessage'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Textarea, Typography } from '~/components/ui'
import { buildLlmArticleAuditsQueryKey, useArticleAuditMutation, useLlmArticleAuditsQuery, useLlmChatHistoryQuery, useLlmModelsQuery } from '~/query/llm'
import { useT } from '~/providers'
import { cn } from '~/utils/cn'
import { time } from '~/utils/time'
/* eslint-enable simple-import-sort/imports */

// eslint-disable-next-line react-refresh/only-export-components
export const isLlmUiEnabled = (): boolean => process.env.NEXT_PUBLIC_LLM_ENABLED === 'true'

type ChatRole = 'user' | 'assistant'

export type ChatTurn = { role: ChatRole; content: string }

type AiModalTab = 'chat' | 'audits'

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
}

type ApiErrorShape = { response?: { data?: { message?: string } } }

export const ArticleAiChatModal = (props: Props) => {
  const { articleId, revisionId, articleRevision, open, onOpenChange } = props
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
  const [activeTab, setActiveTab] = useState<AiModalTab>('chat')
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const auditDetailRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const modelsQuery = useLlmModelsQuery(open)
  const historyFilter = open && articleId && revisionId ? { articleId, revisionId } : null
  const historyQuery = useLlmChatHistoryQuery(historyFilter, open)
  const articleAuditsQuery = useLlmArticleAuditsQuery(historyFilter, open)
  const { articleAuditMutation } = useArticleAuditMutation()

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
    setActiveTab('chat')
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
    if (activeTab !== 'audits' || !auditMarkdown) {
      return
    }

    auditDetailRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeTab, selectedAuditItem?.id, auditMarkdown])

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
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('errors.unknown')

      setError(msg)
      setMessages((prev) => prev.slice(0, -2))
    } finally {
      setStreaming(false)
    }
  }, [articleId, revisionId, input, messages, model, models, serverLlmEnabled, streaming, t])

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
      const refetched = await articleAuditsQuery.refetch()

      if (body.savedId) {
        setSelectedAuditId(body.savedId)
      } else if (refetched.data?.items?.[0]) {
        setSelectedAuditId(refetched.data.items[0].id)
      }

      setActiveTab('audits')
    } catch (e) {
      const err = e as ApiErrorShape
      const msg = err.response?.data?.message ?? (e instanceof Error ? e.message : t('errors.unknown'))

      setAuditError(msg)
    }
  }, [articleId, revisionId, articleAuditMutation, queryClient, articleAuditsQuery, streaming, serverLlmEnabled, model, models, t])

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
            {isBodyWeak ? <AlertInline message={t('article.ui.aiEmptyBodyHint')} /> : null}

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
                  disabled={streaming || auditLoading}
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex gap-1 rounded-md border border-border bg-muted/30 p-1">
                <button
                  type="button"
                  className={cn(
                    'flex-1 rounded-sm px-3 py-2 text-sm font-medium transition-colors',
                    activeTab === 'chat' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setActiveTab('chat')}
                >
                  {t('article.ui.aiTabChat')}
                </button>
                <button
                  type="button"
                  className={cn(
                    'flex-1 rounded-sm px-3 py-2 text-sm font-medium transition-colors',
                    activeTab === 'audits' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setActiveTab('audits')}
                >
                  {t('article.ui.aiTabAudits')}
                  {auditItems.length > 0 ? <span className="ml-1.5 tabular-nums text-muted-foreground">({auditItems.length})</span> : null}
                </button>
              </div>
            </div>

            {activeTab === 'chat' ? (
              <>
                <div ref={scrollRef} className="min-h-[220px] max-h-[min(52vh,520px)] overflow-y-auto rounded-md border border-border bg-muted/30 p-3 text-sm">
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
