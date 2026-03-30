import './globals.css'

import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { cookies, headers } from 'next/headers'

import { detectLocaleFromNextCookiesAndHeaders } from '~/lib/i18n/detectLocale'
import { seoConfig } from '~/lib/seo/config'
import { QueryProvider } from '~/providers'
import { AuthProvider } from '~/providers/auth'
import { CookieConsentProvider } from '~/providers/cookie-consent'
import { DeferredClientChrome } from '~/providers/DeferredClientChrome'
import { I18nProvider } from '~/providers/i18n'
import { NotifyProvider } from '~/providers/notify'

const geistSans = Geist({
  variable: '--font-geist-sans',
  /** RU-локаль без лишнего FOUT на кириллице (небольшой прирост веса шрифта). */
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  adjustFontFallback: true,
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
  adjustFontFallback: true,
})

const METADATA_FALLBACK_IMAGE = '/images/web-app-manifest-192x192.png'

export const metadata: Metadata = {
  metadataBase: new URL(seoConfig.siteUrl),
  manifest: '/images/site.webmanifest',
  title: {
    default: seoConfig.defaultTitle,
    template: `%s | ${seoConfig.siteName}`,
  },
  description: seoConfig.defaultDescription,
  applicationName: seoConfig.siteName,
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/images/favicon.ico' },
      { url: '/images/favicon.svg', type: 'image/svg+xml' },
      { url: '/images/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: '/images/apple-touch-icon.png',
    other: [
      {
        rel: 'manifest',
        url: '/images/site.webmanifest',
      },
    ],
  },
  openGraph: {
    type: 'website',
    siteName: seoConfig.siteName,
    url: seoConfig.siteUrl,
    title: seoConfig.defaultTitle,
    description: seoConfig.defaultDescription,
    images: [METADATA_FALLBACK_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: seoConfig.defaultTitle,
    description: seoConfig.defaultDescription,
    images: [METADATA_FALLBACK_IMAGE],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = detectLocaleFromNextCookiesAndHeaders({
    cookies: await cookies(),
    headers: await headers(),
  })

  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <QueryProvider>
          <AuthProvider>
            <NotifyProvider>
              <CookieConsentProvider>
                <I18nProvider locale={locale}>
                  <DeferredClientChrome />
                  {children}
                </I18nProvider>
              </CookieConsentProvider>
            </NotifyProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
