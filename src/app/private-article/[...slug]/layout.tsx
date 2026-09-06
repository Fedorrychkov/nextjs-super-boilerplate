import type { Metadata } from 'next'

import { LandingLayout } from '~/components/Layouts/LandingLayout'
import { seoConfig } from '~/lib/seo/config'

export const metadata: Metadata = {
  title: {
    default: 'Article',
    template: '%s | Article',
  },
  description: 'Private article',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nocache: true,
    noimageindex: true,
  },
}

export default function PrivateArticleLayout({
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
