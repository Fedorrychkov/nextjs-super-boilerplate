/** Tabs that participate in editor "Next" flow — excludes in-app `preview` (opens external preview). */
export const ARTICLE_EDITOR_NEXT_ORDER = ['preview-information', 'content', 'seo', 'translations', 'publication'] as const

export type ArticleEditorTabLike = { value: string; isEnabled?: boolean }

export function getNextArticleEditorTabValue(current: string, steps: ArticleEditorTabLike[]): string | null {
  const enabled = new Set(steps.filter((s) => s.isEnabled !== false).map((s) => s.value))
  const order = ARTICLE_EDITOR_NEXT_ORDER as readonly string[]
  const idx = order.indexOf(current)

  if (idx === -1) {
    return null
  }

  for (let i = idx + 1; i < order.length; i++) {
    const v = order[i]

    if (enabled.has(v)) {
      return v
    }
  }

  return null
}
