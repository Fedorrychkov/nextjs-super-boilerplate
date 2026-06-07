import Link from 'next/link'

import { ArticleModel, ArticleVisibility } from '~/api/article'
import { ImageLoader } from '~/components/Containers/ImageLoader'
import { Skeleton } from '~/components/Loaders'
import { routes } from '~/constants'
import type { TFunction } from '~/lib/i18n'
import { cn } from '~/utils/cn'

type Props = {
  article: Partial<
    ArticleModel & {
      thumbnailUrl?: string | null
      title?: string | null
      description?: string | null
    }
  >
  t: TFunction
  publishComponent: React.ReactNode
  className?: string
}

export const ArticleItemComponent = async (props: Props) => {
  const { article, publishComponent, t, className } = props

  const href =
    article.visibility === ArticleVisibility.PUBLIC
      ? routes.articlePublic.path.replace(':slug', article.slug ?? '')
      : routes.articlePrivate.path.replace(':slug', article.slug ?? '')

  return (
    <article
      aria-label={article.title ?? 'Article'}
      className={cn(
        'group flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md hover:border-border/80 transition-all',
        className,
      )}
    >
      {/* Thumbnail */}
      <Link href={href} className="block overflow-hidden" tabIndex={-1} aria-hidden>
        <div className="relative aspect-[16/9] w-full bg-muted overflow-hidden">
          {article.thumbnailUrl ? (
            <ImageLoader
              src={article.thumbnailUrl}
              alt={article.title ?? 'Article thumbnail'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              defaultPlaceholder={<Skeleton className="w-full h-full" />}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground/30">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="flex flex-col flex-1 gap-3 p-4">
        {/* Date */}
        <div className="text-xs text-muted-foreground">{publishComponent}</div>

        {/* Title */}
        <Link href={href} className="group/title">
          <h3 className="font-semibold text-foreground text-sm leading-snug group-hover/title:text-foreground/80 transition-colors line-clamp-2">
            {article.title}
          </h3>
        </Link>

        {/* Description */}
        {article.description && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 flex-1">{article.description}</p>}

        {/* Read more */}
        <Link href={href} className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-foreground/60 hover:text-foreground transition-colors">
          {t('article.ui.readMore')}
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      </div>
    </article>
  )
}
