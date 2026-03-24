import { getServerForPublicArticlesPaginated } from '@lib/server-action/server-article'

import { ArticleItem } from '~/components/Views/Article/Block/ArticleItem'

export const dynamic = 'force-dynamic'

export default async function ArticlePage() {
  const articles = await getServerForPublicArticlesPaginated({ limit: 20, offset: 0 })

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {articles?.list?.map((article) => (
          <ArticleItem key={article.id} article={article} />
        ))}
      </div>
    </div>
  )
}
