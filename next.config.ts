// Extract domain from URL
const extractDomain = (url: string) => {
  if (!url) return null

  try {
    const urlObj = new URL(url)

    return urlObj.origin
  } catch {
    return null
  }
}

// Get domains from environment
const apiUrl = process.env.API_URL
const apiDomain = extractDomain(apiUrl || '')

// Allowed domains for connect-src
const connectSrcDomains = [
  '\'self\'',
  'https:',
  'wss:',
  'ws:',
  'https://mc.yandex.ru',
  'https://mc.yandex.com',
  'https://www.google-analytics.com',
  'https://analytics.google.com',
]

// Add env domains to the list
if (apiDomain) connectSrcDomains.push(apiDomain)

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      'default-src \'self\'',
      'script-src \'self\' \'unsafe-inline\' \'unsafe-eval\' https://mc.yandex.ru https://mc.yandex.com https://www.googletagmanager.com',
      'style-src \'self\' \'unsafe-inline\' https://fonts.googleapis.com',
      'img-src \'self\' data: https: https://mc.yandex.ru https://mc.yandex.com https://www.google-analytics.com https://analytics.google.com',
      'font-src \'self\' https://fonts.gstatic.com',
      `connect-src ${connectSrcDomains.join(' ')}`,
      'frame-src \'self\' https://mc.yandex.ru https://mc.yandex.com https://www.google.com https://accounts.google.com',
      'frame-ancestors \'self\' https://web.telegram.org https://*.telegram.org',
      'media-src \'self\' https://mc.yandex.ru https://mc.yandex.com',
      'worker-src \'self\' https://mc.yandex.ru https://mc.yandex.com',
      'child-src \'self\' https://mc.yandex.ru https://mc.yandex.com',
      'object-src \'none\'',
      'base-uri \'self\'',
      'form-action \'self\'',
      'upgrade-insecure-requests',
    ].join('; '),
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Add security headers
  async headers() {
    return [
      {
        // Apply to all pages
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
  experimental: {
    optimizePackageImports: ['framer-motion', 'cmdk', 'lucide-react'],
  },
}

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer(nextConfig)
