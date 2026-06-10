import Link from 'next/link'

import { cn } from '~/utils/cn'

type BreadcrumbItem = {
  label: string
  href?: string
}

type Props = {
  /** Breadcrumb trail — last item is current page (no link needed). */
  breadcrumbs?: BreadcrumbItem[]
  title: string
  thumbnailUrl?: string | null
  articleLanguage?: string
  bodyHtml: string
  /** Slot for author + date + listen audio row */
  meta?: React.ReactNode
  /** Slot for translation banners, language nav, etc. */
  banners?: React.ReactNode
  /** Label + href for the back link at the bottom */
  backLink?: { label: string; href: string }
  /** Optional badge shown above the title (e.g. "Preview", "Private") */
  badge?: React.ReactNode
  className?: string
}

/**
 * Shared reading layout for public, private-article, and preview article pages.
 * Drop-in replacement for the old PreviewUniversalLayout article shell.
 */
export const ArticleReadingShell = ({ breadcrumbs, title, articleLanguage, bodyHtml, meta, banners, backLink, badge, className }: Props) => {
  return (
    <div className={cn('mx-auto max-w-3xl px-4 sm:px-6 py-10', className)}>
      {/* Breadcrumb */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-8 flex-wrap" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden>/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-foreground transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground truncate max-w-[200px]">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Article header */}
      <header className="mb-8">
        {/* Translation / info banners */}
        {banners && <div className="mb-4 flex flex-col gap-3">{banners}</div>}

        {/* Badge (Preview / Private) */}
        {badge && <div className="mb-3">{badge}</div>}

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight mb-4">{title}</h1>

        {/* Meta row: author + date + listen */}
        {meta && <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground border-b border-border/60 pb-5">{meta}</div>}
      </header>

      {/* Article body */}
      <div className="tiptap readonly prose prose-neutral dark:prose-invert max-w-none" lang={articleLanguage} dangerouslySetInnerHTML={{ __html: bodyHtml }} />

      {/* Back link */}
      {backLink && (
        <div className="mt-12 pt-6 border-t border-border/60">
          <Link href={backLink.href} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <span aria-hidden>←</span> {backLink.label}
          </Link>
        </div>
      )}
    </div>
  )
}
