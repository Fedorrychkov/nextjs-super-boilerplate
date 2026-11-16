import { getServerForPublicArticlesPaginated } from '@lib/server-action/server-article'
import type { Metadata } from 'next'

import { ArticlesPreview, FaqSection, Features, Hero, LandingFooter, QuickStart } from '~/components/Landing'
import { LANDING_FAQ_IDS } from '~/components/Landing/landing-i18n'
import { LandingLayout } from '~/components/Layouts/LandingLayout'
import { FALLBACK_THUMBNAIL_IMAGE } from '~/constants'
import { getServerT } from '~/lib/i18n/server'
import { getAlternateOgLocale, toOgLocale } from '~/lib/seo/articleLanguage'
import { seoConfig } from '~/lib/seo/config'
import { getFaqPageJsonLd, getOrganizationJsonLd, getPersonJsonLd, getSoftwareApplicationJsonLd, getWebSiteJsonLd, JsonLd } from '~/lib/seo/jsonld'

import { PRODUCT_CONFIG } from '../../config/product'

/** List of articles from Mongo — only on request, not on `next build` */
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getServerT()
  const title = t('nbs.meta.title')
  const description = t('nbs.meta.description')
  const ogLocale = toOgLocale(locale)

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      siteName: seoConfig.siteName,
      url: seoConfig.siteUrl,
      title,
      description,
      images: [{ url: FALLBACK_THUMBNAIL_IMAGE }],
      locale: ogLocale,
      alternateLocale: [getAlternateOgLocale(locale)],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [FALLBACK_THUMBNAIL_IMAGE],
    },
    alternates: {
      canonical: '/',
    },
  }
}

export default async function Home() {
  const { t } = await getServerT()

  const organizationJsonLd = getOrganizationJsonLd()
  const personJsonLd = getPersonJsonLd()
  const webSiteJsonLd = getWebSiteJsonLd()
  const softwareJsonLd = getSoftwareApplicationJsonLd(t('nbs.meta.description'))
  const githubUrl = seoConfig.links.github
  const demoUrl = seoConfig.externalDemoUrl

  const articles = await getServerForPublicArticlesPaginated({ limit: 4, offset: 0 })

  const faqItems = LANDING_FAQ_IDS.map((id) => ({
    question: t(`nbs.faq.items.${id}.question`),
    answer: t(`nbs.faq.items.${id}.answer`),
  }))

  const faqJsonLd = getFaqPageJsonLd(faqItems)

  return (
    <>
      <JsonLd data={organizationJsonLd} />
      {personJsonLd ? <JsonLd data={personJsonLd} /> : null}
      <JsonLd data={webSiteJsonLd} />
      {softwareJsonLd ? <JsonLd data={softwareJsonLd} /> : null}
      <JsonLd data={faqJsonLd} />

      <LandingLayout githubUrl={githubUrl} demoUrl={demoUrl}>
        <Hero githubUrl={githubUrl} demoUrl={demoUrl} />
        <Features />
        <QuickStart githubUrl={githubUrl} />
        <ArticlesPreview articles={articles?.list ?? []} />
        <FaqSection items={faqItems} />
        <LandingFooter githubUrl={githubUrl} demoUrl={demoUrl} authorName={PRODUCT_CONFIG.author?.name} authorUrl={PRODUCT_CONFIG.author?.url} />
      </LandingLayout>
    </>
  )
}
