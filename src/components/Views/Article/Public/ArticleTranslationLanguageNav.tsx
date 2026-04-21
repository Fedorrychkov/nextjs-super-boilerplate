import { cn } from '~/utils/cn'

export type ArticleTranslationLanguageNavItem = {
  hreflangKey: string
  url: string
  isCurrent: boolean
}

type Props = {
  ariaLabel: string
  items: ArticleTranslationLanguageNavItem[]
}

/**
 * In-page links to other published locales in the same translation group (hreflang cluster).
 */
export function ArticleTranslationLanguageNav(props: Props) {
  const { ariaLabel, items } = props

  if (items.length < 2) {
    return null
  }

  return (
    <nav aria-label={ariaLabel} className="mb-4 flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <a
          key={item.hreflangKey}
          href={item.url}
          hrefLang={item.hreflangKey}
          rel="alternate"
          aria-current={item.isCurrent ? 'true' : undefined}
          className={cn(
            'inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition-colors',
            item.isCurrent
              ? 'border-primary bg-primary text-primary-foreground pointer-events-none'
              : 'border-border bg-muted/50 text-foreground hover:bg-muted',
          )}
        >
          {item.hreflangKey}
        </a>
      ))}
    </nav>
  )
}
