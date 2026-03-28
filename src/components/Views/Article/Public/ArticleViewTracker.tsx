'use client'

import { useEffect, useRef } from 'react'

const STORAGE_KEY = 'article_anonymous_visitor_key'

export type ArticleReaderViewSurface = 'public' | 'private'

function getOrCreateVisitorKey(): string {
  try {
    let k = sessionStorage.getItem(STORAGE_KEY)

    if (!k) {
      k = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
      sessionStorage.setItem(STORAGE_KEY, k)
    }

    return k
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

type Props = {
  slug: string
  surface: ArticleReaderViewSurface
}

/**
 * Fire-and-forget view recording for published reader pages (not preview/editor).
 */
export function ArticleViewTracker(props: Props) {
  const { slug, surface } = props
  const sent = useRef(false)

  useEffect(() => {
    if (!slug?.trim() || sent.current) {
      return
    }

    sent.current = true
    const visitorKey = getOrCreateVisitorKey()

    void fetch('/api/v1/article/view', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: slug.trim(), surface, visitorKey }),
    }).catch(() => {
      // best-effort analytics
    })
  }, [slug, surface])

  return null
}
