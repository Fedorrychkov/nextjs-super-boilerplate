import { getServerForPublicArticlesPaginated } from '@lib/server-action/server-article'
import { ArrowRightIcon } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { PreviewUniversalLayout } from '~/components/Layouts/PreviewUniversalLayout'
import { Typography } from '~/components/ui/Typography'
import { ArticleItem } from '~/components/Views/Article/Block/server/ArticleItem'
import { getServerT } from '~/lib/i18n/server'
import { BOILERPLATE_DEMO_URL, BOILERPLATE_GITHUB_REPO_URL, seoConfig } from '~/lib/seo/config'
import { getOrganizationJsonLd, getSoftwareApplicationJsonLd, getWebSiteJsonLd, JsonLd } from '~/lib/seo/jsonld'

const METADATA_FALLBACK_IMAGE = '/images/web-app-manifest-192x192.png'

const ARTICLE_EN_URL = 'https://github.com/Fedorrychkov/fedorrychkov/blob/main/articles/standalone-nextjs-production-ready-boilerplate/ARTICLE_EN.md'
const ARTICLE_RU_URL = 'https://github.com/Fedorrychkov/fedorrychkov/blob/main/articles/standalone-nextjs-production-ready-boilerplate/ARTICLE_RU.md'

/** List of articles from Mongo — only on request, not on `next build` */
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerT()
  const title = t('home.metaTitle')
  const description = t('home.metaDescription')

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      siteName: seoConfig.siteName,
      url: seoConfig.siteUrl,
      title,
      description,
      images: [{ url: METADATA_FALLBACK_IMAGE }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [METADATA_FALLBACK_IMAGE],
    },
    alternates: {
      canonical: '/',
    },
  }
}

export default async function Home() {
  const { t } = await getServerT()

  const organizationJsonLd = getOrganizationJsonLd()
  const webSiteJsonLd = getWebSiteJsonLd()
  const softwareJsonLd = getSoftwareApplicationJsonLd(t('home.metaDescription'))

  const articles = await getServerForPublicArticlesPaginated({ limit: 4, offset: 0 })

  const readmeUrl = `${BOILERPLATE_GITHUB_REPO_URL}/blob/main/README.md`
  const docsTreeUrl = `${BOILERPLATE_GITHUB_REPO_URL}/tree/main/docs`

  return (
    <>
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={webSiteJsonLd} />
      <JsonLd data={softwareJsonLd} />
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
        <div className="mt-14 flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xl text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            {t('home.minimalProductionReadyNextjsBoilerplate')}
          </h1>
          <p className="max-w-prose text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            {t('home.lookingForAStartingPointOrMoreInstructionsHeadOverTo')}{' '}
            <a href={BOILERPLATE_GITHUB_REPO_URL} className="font-medium text-zinc-950 dark:text-zinc-50">
              {t('home.githubRepository')}
            </a>{' '}
            {t('home.orThe')}{' '}
            <a href={ARTICLE_EN_URL} className="font-medium text-zinc-950 dark:text-zinc-50">
              {t('home.aboutBoilerplate')}
            </a>{' '}
          </p>
          <p className="max-w-prose text-base leading-7 text-zinc-600 dark:text-zinc-400">{t('home.leadSupplement')}</p>
        </div>
        <div className="mt-14 flex flex-col gap-4 text-base font-medium sm:flex-row">
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

        <div className="mt-14 w-full space-y-10 text-left border-t border-zinc-200/80 pt-10 dark:border-zinc-800">
          <section aria-labelledby="home-features">
            <h2 id="home-features" className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {t('home.sectionFeaturesHeading')}
            </h2>
            <p className="mt-3 max-w-prose text-base leading-7 text-zinc-600 dark:text-zinc-400">{t('home.sectionFeaturesIntro')}</p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-7 text-zinc-700 dark:text-zinc-300">
              <li>{t('home.featureAuth')}</li>
              <li>{t('home.featureArticles')}</li>
              <li>{t('home.featureAdmin')}</li>
              <li>{t('home.featureDeploy')}</li>
              <li>{t('home.featureDevEx')}</li>
            </ul>
          </section>

          <section aria-labelledby="home-stack">
            <h2 id="home-stack" className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {t('home.sectionStackHeading')}
            </h2>
            <p className="mt-3 max-w-prose text-base leading-7 text-zinc-600 dark:text-zinc-400">{t('home.sectionStackBody')}</p>
          </section>

          <section aria-labelledby="home-docs">
            <h2 id="home-docs" className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {t('home.sectionLearnHeading')}
            </h2>
            <p className="mt-3 max-w-prose text-base leading-7 text-zinc-600 dark:text-zinc-400">{t('home.sectionLearnBody')}</p>
            <nav>
              <ul className="mt-4 flex flex-col gap-2 text-base font-medium text-blue-600 dark:text-blue-400">
                <li>
                  <a href={readmeUrl} className="underline-offset-4 hover:underline" rel="noopener noreferrer">
                    {t('home.linkReadme')}
                  </a>
                </li>
                <li>
                  <a href={docsTreeUrl} className="underline-offset-4 hover:underline" rel="noopener noreferrer">
                    {t('home.linkDocsFolder')}
                  </a>
                </li>
                <li>
                  <a href={ARTICLE_EN_URL} className="underline-offset-4 hover:underline" rel="noopener noreferrer">
                    {t('home.linkArticleEn')}
                  </a>
                </li>
                <li>
                  <a href={ARTICLE_RU_URL} className="underline-offset-4 hover:underline" rel="noopener noreferrer">
                    {t('home.linkArticleRu')}
                  </a>
                </li>
                <li>
                  <a href={BOILERPLATE_DEMO_URL} className="underline-offset-4 hover:underline" rel="noopener noreferrer">
                    {t('home.linkLiveDemo')}
                  </a>
                </li>
                <li>
                  <Link href="/articles" className="underline-offset-4 hover:underline">
                    {t('home.linkArticlesIndex')}
                  </Link>
                </li>
              </ul>
            </nav>
          </section>

          <section aria-labelledby="home-agents">
            <h2 id="home-agents" className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {t('home.sectionAgentsHeading')}
            </h2>
            <p className="mt-3 max-w-prose text-base leading-7 text-zinc-600 dark:text-zinc-400">
              {t('home.sectionAgentsBody')}{' '}
              <Link href="/llms.txt" className="font-medium text-zinc-950 underline underline-offset-4 dark:text-zinc-50">
                {t('home.linkLlmsTxt')}
              </Link>
            </p>
          </section>

          <section aria-labelledby="home-trust">
            <h2 id="home-trust" className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {t('home.sectionAboutHeading')}
            </h2>
            <p className="mt-3 max-w-prose text-base leading-7 text-zinc-600 dark:text-zinc-400">{t('home.sectionAboutBody')}</p>
          </section>
        </div>
      </PreviewUniversalLayout>
    </>
  )
}
