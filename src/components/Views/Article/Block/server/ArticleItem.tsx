import { ArticleModel } from '~/api/article'
import { getServerT } from '~/lib/i18n/server'

import { ArticleItemComponent } from '../ArticleItemComponent'
import { ArticlePublishedDate } from './ArticlePublishedDate'

type Props = {
  article: Partial<
    ArticleModel & {
      thumbnailUrl?: string | null
      title?: string | null
      description?: string | null
    }
  >
}

/** Server-rendered card — use for SEO / crawlers. For rows inside client boundaries (e.g. “Load more”), see `ArticleItemClient`. */
export const ArticleItem = async (props: Props) => {
  const { article } = props
  const { t } = await getServerT()

  return <ArticleItemComponent article={article} t={t} publishComponent={<ArticlePublishedDate publishedAt={article.publishedAt} />} />
}
