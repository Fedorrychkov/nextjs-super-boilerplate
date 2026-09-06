import type { Metadata } from 'next'

import { LandingLayout } from '~/components/Layouts/LandingLayout'
import { seoConfig } from '~/lib/seo/config'

export const metadata: Metadata = {
  title: {
    default: 'Articles',
    template: '%s | Articles',
  },
  description: 'Articles list page',
}

export default function ArticlePublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <LandingLayout githubUrl={seoConfig.links.github} demoUrl={seoConfig.externalDemoUrl}>
      {children}
    </LandingLayout>
  )
}
