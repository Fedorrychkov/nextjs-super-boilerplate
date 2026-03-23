import type { Metadata } from 'next'

import { PreviewUniversalLayout } from '~/components/Layouts/PreviewUniversalLayout'

export const metadata: Metadata = {
  title: {
    default: 'Articles List',
    template: '%s | Articles List',
  },
  description: 'Articles list page',
}

export default function ArticlePublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <PreviewUniversalLayout isNavEnabled>{children}</PreviewUniversalLayout>
}
