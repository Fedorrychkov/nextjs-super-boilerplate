import './globals.css'

import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { cookies, headers } from 'next/headers'

import { detectLocaleFromNextCookiesAndHeaders } from '~/lib/i18n/detectLocale'
import { seoConfig } from '~/lib/seo/config'
import { QueryProvider } from '~/providers'
import { AuthProvider } from '~/providers/auth'
import { CookieConsentBanner, CookieConsentProvider } from '~/providers/cookie-consent'
import { I18nProvider } from '~/providers/i18n'
import { NotifyProvider } from '~/providers/notify'
import { WebVitalsReporter } from '~/providers/Rum/WebVitalsReporter'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL(seoConfig.siteUrl),
  title: {
    default: seoConfig.defaultTitle,
    template: `%s | ${seoConfig.siteName}`,
  },
  description: seoConfig.defaultDescription,
  applicationName: seoConfig.siteName,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: seoConfig.siteName,
    url: seoConfig.siteUrl,
    title: seoConfig.defaultTitle,
    description: seoConfig.defaultDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: seoConfig.defaultTitle,
    description: seoConfig.defaultDescription,
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
                  <WebVitalsReporter />
                  <CookieConsentBanner />
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
