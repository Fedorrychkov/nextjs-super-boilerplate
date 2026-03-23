import type { Metadata } from 'next'

import { ArticleLayout } from '~/components/Layouts/ArticleLayout'

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
  return <ArticleLayout>{children}</ArticleLayout>
}
