'use client'

/* eslint-disable simple-import-sort/imports -- react, @lib, ~/ */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { extractPlainTextFromRevisionContent } from '@lib/services/llm/extract-plain-text-from-revision-content'
import { BotIcon } from 'lucide-react'

import { ClientLlmApi } from '~/api/llm'
import type { ArticleRevisionModel } from '~/api/article-revision'
import { articleAuditToMarkdown } from '~/components/Views/Article/Screen/Editable/articleAuditToMarkdown'
import { ArticleAiChatAssistantMessage } from '~/components/Views/Article/Screen/Editable/ArticleAiChatAssistantMessage'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Textarea, Typography } from '~/components/ui'
import { useArticleAuditMutation, useLlmChatHistoryQuery, useLlmModelsQuery } from '~/query/llm'
import { useT } from '~/providers'
import { cn } from '~/utils/cn'
/* eslint-enable simple-import-sort/imports */

// eslint-disable-next-line react-refresh/only-export-components
export const isLlmUiEnabled = (): boolean => process.env.NEXT_PUBLIC_LLM_ENABLED === 'true'

type ChatRole = 'user' | 'assistant'

export type ChatTurn = { role: ChatRole; content: string }

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
  const [auditMarkdown, setAuditMarkdown] = useState<string | null>(null)
  const [auditError, setAuditError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const modelsQuery = useLlmModelsQuery(open)
  const historyFilter = open && articleId && revisionId ? { articleId, revisionId } : null
  const historyQuery = useLlmChatHistoryQuery(historyFilter, open)
  const { articleAuditMutation } = useArticleAuditMutation()

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
    setAuditMarkdown(null)
    setAuditError(null)
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
  }, [messages, streaming, auditMarkdown])

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

      setAuditMarkdown(
        articleAuditToMarkdown(body.audit, {
          preview: t('article.ui.aiAuditSectionPreview'),
          content: t('article.ui.aiAuditSectionContent'),
          seo: t('article.ui.aiAuditSectionSeo'),
          overall: t('article.ui.aiAuditOverall'),
          strengths: t('article.ui.aiAuditStrengths'),
          issues: t('article.ui.aiAuditIssues'),
          recommendations: t('article.ui.aiAuditRecommendations'),
        }),
      )
    } catch (e) {
      setAuditMarkdown(null)
      const err = e as ApiErrorShape
      const msg = err.response?.data?.message ?? (e instanceof Error ? e.message : t('errors.unknown'))

      setAuditError(msg)
    }
  }, [articleId, revisionId, articleAuditMutation, streaming, serverLlmEnabled, model, models, t])

  const historyLoading = historyQuery.isLoading
  const auditLoading = articleAuditMutation.isLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] min-w-[80vw] w-full max-w-2xl flex-col gap-3 p-4 sm:p-6">
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <label className="flex flex-1 flex-col gap-1 text-sm text-muted-foreground">
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
              <Button type="button" variant="secondary" onClick={() => void handleAudit()} disabled={streaming || auditLoading}>
                {auditLoading ? t('article.ui.aiAuditing') : t('article.ui.aiAuditArticle')}
              </Button>
            </div>

            <div ref={scrollRef} className="min-h-[200px] max-h-[45vh] overflow-y-auto rounded-md border border-border bg-muted/30 p-3 text-sm">
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

            {auditMarkdown ? (
              <div className="flex max-h-[30vh] flex-col gap-2 overflow-hidden rounded-md border border-border bg-muted/20 p-3">
                <Typography variant="Body/S/Semibold" className="text-foreground">
                  {t('article.ui.aiAuditResultTitle')}
                </Typography>
                <div className="max-h-[24vh] overflow-y-auto">
                  <ArticleAiChatAssistantMessage content={auditMarkdown} />
                </div>
              </div>
            ) : null}

            {auditError ? <AlertInline message={auditError} destructive /> : null}

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
