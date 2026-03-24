import type { PageProps } from '@lib/page'
import { getServerForPublicArticlesPaginated } from '@lib/server-action/server-article'

import { articleFilterFromPublicSearchParams, PUBLIC_ARTICLES_PAGE_SIZE } from '~/api/article/publicListQuery'
import { Typography } from '~/components/ui/Typography/Typography'
import { ArticlesPublicFeed } from '~/components/Views/Article/Public'

export const dynamic = 'force-dynamic'

export default async function ArticlePage(props: PageProps) {
  const sp = await props.searchParams
  const listQuery = articleFilterFromPublicSearchParams(sp)
  listQuery.limit = PUBLIC_ARTICLES_PAGE_SIZE
  listQuery.offset = 0

  const initial = await getServerForPublicArticlesPaginated(listQuery)

  if (!initial) {
    return (
      <Typography variant="Body/M/Regular" className="text-destructive">
        Could not load articles.
      </Typography>
    )
  }

  return <ArticlesPublicFeed initial={initial} listQuery={listQuery} />
}
