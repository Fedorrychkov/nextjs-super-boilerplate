import type { Metadata } from 'next'

import { PreviewUniversalLayout } from '~/components/Layouts/PreviewUniversalLayout'

export const metadata: Metadata = {
  title: {
    default: 'Article',
    template: '%s | Article',
  },
  description: 'Article page',
}

export default function ArticlePublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <PreviewUniversalLayout isNavEnabled>{children}</PreviewUniversalLayout>
}
