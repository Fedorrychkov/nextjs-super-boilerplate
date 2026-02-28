import './globals.css'

import { Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { QueryProvider } from '~/providers'
import { AuthProvider } from '~/providers/auth'
import { NotifyProvider } from '~/providers/notify'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <title>Production Ready Next.js Boilerplate</title>
        <meta name="description" content="You can use this boilerplate to start your best next project" />
        <link rel="icon" href="/favicon.ico" />

        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Production Ready Next.js Boilerplate" />
        <meta name="apple-mobile-web-app-title" content="Production Ready Next.js Boilerplate" />
        <meta name="msapplication-starturl" content="/" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <QueryProvider>
          <AuthProvider>
            <NotifyProvider>{children}</NotifyProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
