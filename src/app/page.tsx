import { getServerForPublicArticlesPaginated } from '@lib/server-action/server-article'
import { ArrowRightIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { PreviewUniversalLayout } from '~/components/Layouts/PreviewUniversalLayout'
import { Typography } from '~/components/ui/Typography'
import { ArticleItem } from '~/components/Views/Article/Block/server/ArticleItem'
import { getServerT } from '~/lib/i18n/server'
import { getOrganizationJsonLd, getWebSiteJsonLd, JsonLd } from '~/lib/seo/jsonld'

/** List of articles from Mongo — only on request, not on `next build` */
export const dynamic = 'force-dynamic'

export default async function Home() {
  const { t } = await getServerT()

  const organizationJsonLd = getOrganizationJsonLd()
  const webSiteJsonLd = getWebSiteJsonLd()

  const articles = await getServerForPublicArticlesPaginated({ limit: 4, offset: 0 })

  return (
    <>
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={webSiteJsonLd} />
      <PreviewUniversalLayout
        content={
          <div className="flex flex-col gap-4 my-10 container max-w-3xl px-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-row justify-between items-center">
                <Typography variant="heading-2">{t('home.latestArticles')}</Typography>
                <Link href="/articles" className="text-sm text-blue-500 flex flex-row items-center gap-2 whitespace-nowrap">
                  {t('home.viewAll')} <ArrowRightIcon className="w-4 h-4 shrink-0" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                {articles?.list?.map((article) => (
                  <ArticleItem key={article.id} article={article} />
                ))}
              </div>
            </div>
          </div>
        }
      >
        <Image className="dark:invert" src="/next.svg" alt="Next.js logo" width={100} height={20} priority />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            {t('home.minimalProductionReadyNextjsBoilerplate')}
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            {t('home.lookingForAStartingPointOrMoreInstructionsHeadOverTo')}{' '}
            <a href="https://github.com/Fedorrychkov/nextjs-super-boilerplate" className="font-medium text-zinc-950 dark:text-zinc-50">
              {t('home.githubRepository')}
            </a>{' '}
            {t('home.orThe')}{' '}
            <a
              href="https://github.com/Fedorrychkov/fedorrychkov/blob/main/articles/standalone-nextjs-production-ready-boilerplate/ARTICLE_EN.md"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              {t('home.aboutBoilerplate')}
            </a>{' '}
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <Link
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[320px] whitespace-nowrap"
            href="/ui-kit"
            rel="noopener noreferrer"
          >
            <Image className="dark:invert" src="/vercel.svg" alt="Vercel logomark" width={16} height={16} />
            {t('home.openUiKit')}
          </Link>
          <Link
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-foreground transition-colors hover:scale-105 hover:text-foreground/90 md:w-[320px]"
            href="/profile"
            rel="noopener noreferrer"
          >
            {t('home.tryAuth')}
          </Link>
        </div>
      </PreviewUniversalLayout>
    </>
  )
}
