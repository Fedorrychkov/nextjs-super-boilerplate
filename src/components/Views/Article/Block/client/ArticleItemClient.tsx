'use client'

import { ArticleModel } from '~/api/article'
import { useT } from '~/providers/i18n'

import { ArticleItemComponent } from '../ArticleItemComponent'
import { ArticlePublishedDateClient } from './ArticlePublishedDateClient'

type Props = {
  article: Partial<
    ArticleModel & {
      thumbnailUrl?: string | null
      title?: string | null
      description?: string | null
    }
  >
}

/** Client-only duplicate for “Load more” rows (parent is a client component and cannot host async RSC). */
export const ArticleItemClient = (props: Props) => {
  const { article } = props
  const t = useT()

  return <ArticleItemComponent article={article} t={t} publishComponent={<ArticlePublishedDateClient publishedAt={article.publishedAt} />} />
}
