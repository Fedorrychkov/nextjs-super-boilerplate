import type { Metadata } from 'next'

import { PreviewUniversalLayout } from '~/components/Layouts/PreviewUniversalLayout'

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

export default function PreviewLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <PreviewUniversalLayout isNavEnabled>{children}</PreviewUniversalLayout>
}
