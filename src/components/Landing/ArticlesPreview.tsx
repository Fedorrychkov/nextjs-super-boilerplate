import Link from 'next/link'

import { ArticleItem } from '~/components/Views/Article/Block/server/ArticleItem'
import { getServerT } from '~/lib/i18n/server'

type Article = {
  id: string
  [key: string]: unknown
}

type Props = {
  articles: Article[]
}

export const ArticlesPreview = async ({ articles }: Props) => {
  if (!articles?.length) return null

  const { t } = await getServerT()

  return (
    <section className="border-b border-border/40 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{t('nbs.articles.title')}</h2>
            <p className="mt-2 text-muted-foreground text-sm">{t('nbs.articles.subtitle')}</p>
          </div>
          <Link
            href="/articles"
            className="hidden sm:flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {t('nbs.articles.viewAll')} <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {articles.map((article) => (
            <ArticleItem key={article.id} article={article} />
          ))}
        </div>

        <div className="mt-6 flex sm:hidden">
          <Link href="/articles" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {t('nbs.articles.viewAllMobile')}
          </Link>
        </div>
      </div>
    </section>
  )
}
