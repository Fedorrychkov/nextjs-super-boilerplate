import type { Metadata } from 'next'

import { LandingLayout } from '~/components/Layouts/LandingLayout'
import { seoConfig } from '~/lib/seo/config'

export const metadata: Metadata = {
  title: {
    default: 'Article Preview',
    template: '%s | Article Preview',
  },
  description: 'Preview mode for article editors',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nocache: true,
    noimageindex: true,
  },
}

export default function PreviewLayout({
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
