import './globals.css'

import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { cookies, headers } from 'next/headers'

import { FALLBACK_THUMBNAIL_IMAGE } from '~/constants'
import { detectLocaleFromNextCookiesAndHeaders } from '~/lib/i18n/detectLocale'
import { getLocaleOverrides } from '~/lib/i18n/getLocaleOverrides'
import { seoConfig } from '~/lib/seo/config'
import { trackAiReferralFromRequestHeaders } from '~/lib/seo/trackAiReferralInRootLayout'
import { resolveServerTheme } from '~/lib/theme/resolveServerTheme'
import { QueryProvider } from '~/providers'
import { AnchorScrollProvider } from '~/providers/anchor-scroll'
import { AuthProvider } from '~/providers/auth'
import { CookieConsentProvider } from '~/providers/cookie-consent'
import { DeferredClientChrome } from '~/providers/DeferredClientChrome'
import { I18nProvider } from '~/providers/i18n'
import { NotifyProvider } from '~/providers/notify'
import { ThemeProvider, ThemeScript } from '~/providers/theme'

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
    images: [{ url: FALLBACK_THUMBNAIL_IMAGE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: seoConfig.defaultTitle,
    description: seoConfig.defaultDescription,
    images: [FALLBACK_THUMBNAIL_IMAGE],
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
  const locale = await detectLocaleFromNextCookiesAndHeaders({
    cookies: await cookies(),
    headers: await headers(),
  })
  const localeOverrides = await getLocaleOverrides(locale)
  const theme = await resolveServerTheme({
    cookies: await cookies(),
    headers: await headers(),
  })

  await trackAiReferralFromRequestHeaders()

  return (
    <html lang={locale} className={theme.resolved === 'dark' ? 'dark' : undefined} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <QueryProvider>
          <AuthProvider>
            <NotifyProvider>
              <ThemeProvider initialPreference={theme.preference} initialResolved={theme.resolved}>
                <CookieConsentProvider>
                  <I18nProvider locale={locale} overrides={localeOverrides}>
                    <AnchorScrollProvider>
                      <DeferredClientChrome />
                      {children}
                    </AnchorScrollProvider>
                  </I18nProvider>
                </CookieConsentProvider>
              </ThemeProvider>
            </NotifyProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
