import type { Metadata } from 'next'

import { PreviewUniversalLayout } from '~/components/Layouts/PreviewUniversalLayout'

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
  return <PreviewUniversalLayout isNavEnabled>{children}</PreviewUniversalLayout>
}
