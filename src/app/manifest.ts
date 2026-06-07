import { PRODUCT_CONFIG } from '@config/product'
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PRODUCT_CONFIG.name,
    short_name: PRODUCT_CONFIG.shortName,
    description: PRODUCT_CONFIG.description,
    start_url: '/',
    scope: '/',
    icons: PRODUCT_CONFIG.pwa.icons.map((icon) => ({
      src: icon.src,
      sizes: icon.sizes,
      type: icon.type,
      purpose: 'maskable' as const,
    })),
    theme_color: PRODUCT_CONFIG.pwa.themeColor,
    background_color: PRODUCT_CONFIG.pwa.backgroundColor,
    orientation: PRODUCT_CONFIG.pwa.orientation,
    display: PRODUCT_CONFIG.pwa.display,
  }
}
