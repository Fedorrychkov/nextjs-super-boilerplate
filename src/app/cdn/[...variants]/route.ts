import { buildUploadcareCdnUrl } from '@lib/services/cdn-uploadcare.service'
import { findMediaAssetById } from '@lib/services/media.service'
import { NextRequest, NextResponse } from 'next/server'

import { MediaResourceType, MediaVisibility } from '~/api/media'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const variantToOps: Record<string, string> = {
  original: '',
  // Keep aspect ratio, cap width, avoid upscale.
  inline: '-/autorotate/yes/-/quality/smart/-/format/auto/-/stretch/off/-/resize/1600x/',
  // Thumbnail without distortion/cropping (variable height).
  thumb: '-/autorotate/yes/-/quality/smart/-/format/auto/-/stretch/off/-/resize/600x/',
  // Optional fixed tile thumbnail (square) with smart crop.
  'thumb-square': '-/autorotate/yes/-/quality/smart/-/format/auto/-/scale_crop/600x600/smart/',
  // SEO card usually expects 1200x630, so use smart crop to keep ratio without stretching.
  seo: '-/autorotate/yes/-/quality/smart/-/format/auto/-/scale_crop/1200x630/smart/',
  // Safe SEO variant without crop/stretch (may be smaller than 1200x630).
  'seo-fit': '-/autorotate/yes/-/quality/smart/-/format/auto/-/stretch/off/-/resize/1200x/',
}

/**
 * Public, unauthenticated redirect to the CDN. Serves public assets only: a private one answers
 * 404 here for everyone, including its owner — the same answer as "no such asset", so the route
 * does not confirm that an id exists. Private files go through `/api/v1/media/[id]/file`.
 */
export const GET = async (request: NextRequest, context: { params: Promise<{ variants: string[] }> }) => {
  const { t } = await getServerTFromNextRequestAsync(request)
  const { variants } = await context.params

  const [assetId, variant] = variants || []

  if (!assetId) {
    return NextResponse.json({ message: t('media.errors.invalidRequest') }, { status: 400 })
  }

  const asset = await findMediaAssetById(assetId)

  if (!asset || asset.isDeleted || asset.visibility === MediaVisibility.PRIVATE) {
    return NextResponse.json({ message: t('media.errors.mediaNotFound') }, { status: 404 })
  }

  if (asset.resourceType !== MediaResourceType.IMAGE) {
    const target = buildUploadcareCdnUrl(asset.providerFileId)

    return NextResponse.redirect(target, 302)
  }

  const operations = variantToOps[variant] ?? variantToOps.original
  const target = buildUploadcareCdnUrl(asset.providerFileId, operations)

  return NextResponse.redirect(target, 302)
}
