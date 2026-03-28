'use client'

import { useMemo } from 'react'

import { Typography } from '~/components/ui'
import { useT } from '~/providers'
import { useLlmArticleUsageQuery } from '~/query/llm'
import { cn } from '~/utils/cn'

type Props = {
  articleId: string
  revisionId: string
  enabled: boolean
}

export const ArticleEditorLlmUsageChip = (props: Props) => {
  const { articleId, revisionId, enabled } = props
  const t = useT()
  const filter = enabled ? { articleId, revisionId } : null
  const usageQuery = useLlmArticleUsageQuery(filter, enabled)

  const { chatTokens, auditTokens, structuredTokens } = useMemo(() => {
    const by = usageQuery.data?.bySource ?? []
    const chat = by.find((x) => x.source === 'chat_stream')?.totalTokens ?? 0
    const audit = by.find((x) => x.source === 'article_audit')?.totalTokens ?? 0
    const structured = (by.find((x) => x.source === 'seo_suggest')?.totalTokens ?? 0) + (by.find((x) => x.source === 'preview_suggest')?.totalTokens ?? 0)

    return { chatTokens: chat, auditTokens: audit, structuredTokens: structured }
  }, [usageQuery.data?.bySource])

  if (!enabled) {
    return null
  }

  if (usageQuery.isLoading) {
    return (
      <Typography variant="Body/XS/Regular" className="text-muted-foreground">
        …
      </Typography>
    )
  }

  if (usageQuery.isError || !usageQuery.data) {
    return null
  }

  const total = usageQuery.data.totals.totalTokens

  if (total === 0) {
    return (
      <Typography variant="Body/XS/Regular" className={cn('max-w-[min(100%,360px)] text-muted-foreground')}>
        {t('article.ui.aiEditorUsageEmpty')}
      </Typography>
    )
  }

  return (
    <Typography variant="Body/XS/Regular" className={cn('max-w-[min(100%,480px)] text-muted-foreground')}>
      {t('article.ui.aiEditorUsageSummary', {
        total: total.toLocaleString(),
        chat: chatTokens.toLocaleString(),
        audit: auditTokens.toLocaleString(),
        structured: structuredTokens.toLocaleString(),
      })}
    </Typography>
  )
}
