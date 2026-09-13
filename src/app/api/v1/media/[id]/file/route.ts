import { apiErrorHandlerContainer, RouteHandlerContext, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { buildUploadcareCdnUrl } from '@lib/services/cdn-uploadcare.service'
import { findMediaAssetById } from '@lib/services/media.service'
import { canReadMediaAsset } from '@lib/services/media-access'
import { NextRequest, NextResponse } from 'next/server'

import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'
import { isRasterImageMime } from '~/lib/security/fileSignature'

/**
 * The authorised counterpart of `/cdn`: the bytes are streamed through our origin to the owner
 * or an admin, never cached, and never rendered as a document on our domain. A private asset
 * that is not the caller's answers 404 — the same as one that does not exist.
 */
const handler = (request: NextRequest, authResult: AuthSuccessResult, context?: RouteHandlerContext) =>
  apiErrorHandlerContainer(request)(async () => {
    const { t } = await getServerTFromNextRequestAsync(request)
    const paramsData = context ? await context.params : undefined
    const rawId = paramsData?.id
    const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined

    const asset = id ? await findMediaAssetById(id) : null
    const viewer = { userId: authResult.payload.sub, role: authResult.payload.role }

    if (!asset || asset.isDeleted || !canReadMediaAsset({ visibility: asset.visibility, createdBy: asset.createdBy?.toString() ?? null }, viewer)) {
      return NextResponse.json({ message: t('media.errors.mediaNotFound') }, { status: 404 })
    }

    const upstream = await fetch(buildUploadcareCdnUrl(asset.providerFileId))

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ message: t('media.errors.mediaNotFound') }, { status: 502 })
    }

    const mime = asset.mimeType ?? upstream.headers.get('content-type') ?? 'application/octet-stream'
    const filename = (asset.originalFilename ?? asset._id.toString()).replace(/["\r\n]/g, '')

    return new NextResponse(upstream.body, {
      headers: {
        'Content-Type': mime,
        'X-Content-Type-Options': 'nosniff',
        // Whatever the bytes are, opened directly they are a sandboxed resource, not a page of ours.
        // \u0027 = the single quote CSP requires around none; a literal one fights the quotes lint rule.
        'Content-Security-Policy': 'default-src \u0027none\u0027; sandbox',
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `${isRasterImageMime(mime) ? 'inline' : 'attachment'}; filename="${filename}"`,
      },
    })
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
