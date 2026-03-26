import Link from 'next/link'

import { ArticleModel, ArticleVisibility } from '~/api/article'
import { ImageLoader } from '~/components/Containers/ImageLoader'
import { Skeleton } from '~/components/Loaders'
import { Typography } from '~/components/ui/Typography'
import { routes } from '~/constants'
import type { TFunction } from '~/lib/i18n'

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
}

export const ArticleItemComponent = async (props: Props) => {
  const { article, publishComponent, t } = props

  return (
    <article key={article.id} aria-label={article.title ?? 'Article'} className="flex flex-col gap-4 bg-white p-4 rounded-md shadow-md">
      {article.thumbnailUrl ? (
        <ImageLoader
          src={article.thumbnailUrl}
          alt={article.title ?? 'Article thumbnail'}
          className="w-full h-full object-cover max-h-[200px]"
          defaultPlaceholder={<Skeleton className="w-full h-full object-cover max-h-[200px]" />}
        />
      ) : null}
      {publishComponent}
      <div className="flex flex-col gap-2">
        <Typography variant="heading-3">{article.title}</Typography>
        <Typography variant="Body/M/Regular">{article.description}</Typography>
      </div>
      <div>
        <Link
          href={
            article.visibility === ArticleVisibility.PUBLIC
              ? routes.articlePublic.path.replace(':slug', article.slug ?? '')
              : routes.articlePrivate.path.replace(':slug', article.slug ?? '')
          }
          className="text-sm text-blue-500"
        >
          {t('article.ui.readMore')}
        </Link>
      </div>
    </article>
  )
}
