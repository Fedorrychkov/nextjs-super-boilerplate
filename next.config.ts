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
  'https://www.googletagmanager.com',
  'https://*.google-analytics.com',
  'https://*.analytics.google.com',
  'https://*.yclients.com',
  'wss://*.yclients.com',
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
      'media-src \'self\' blob: https://mc.yandex.ru https://mc.yandex.com https://ucarecdn.com',
      'worker-src \'self\' https://mc.yandex.ru https://mc.yandex.com',
      'child-src \'self\' https://mc.yandex.ru https://mc.yandex.com',
      'object-src \'none\'',
      'base-uri \'self\'',
      'form-action \'self\'',
      'upgrade-insecure-requests',
    ].join('; '),
  },
  ...(process.env.NODE_ENV === 'production'
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains; preload',
        },
      ]
    : []),
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
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
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  // ENABLE, IF YOU USE SELF CDN by your domain
  // {
  //   key: 'Cross-Origin-Embedder-Policy',
  //   value: 'require-corp',
  // },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compiler: {
    /** Убирает случайные `console.log` из прод-сборки; `error`/`warn` оставляем. */
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
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
    optimizePackageImports: [
      'framer-motion',
      'cmdk',
      'lucide-react',
      'radix-ui',
      '@radix-ui/react-dialog',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-slot',
      'dayjs',
      'lodash',
    ],
    /** Inlines critical CSS + defers the rest (`preload: 'media'`). Next still `require('critters')`; we install Beasties under that name (`npm:beasties`). */
    optimizeCss: true,
    /** Inline route CSS to cut render-blocking stylesheets (Next 16 experimental). */
    inlineCss: true,
    // Default 10MB truncates multipart bodies → formData() fails. Keep in sync with src/constants/media-upload.ts.
    proxyClientMaxBodySize: '200mb',
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 414, 640, 768, 1024, 1280],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      /**
       * This is a saas for images, enable it if you use it
       */
      {
        protocol: 'https',
        hostname: 'ucarecdn.com',
      },
    ],
  },
}

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer(nextConfig)
