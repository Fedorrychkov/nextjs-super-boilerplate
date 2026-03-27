import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { listMediaAssets } from '@lib/services/media.service'
import { NextRequest, NextResponse } from 'next/server'

import { MediaResourceType } from '~/api/media'
import { UserRole } from '~/api/user'
import { getServerTFromNextRequest } from '~/lib/i18n/server'

const mapAsset = (asset: any) => ({
  ...asset.toObject(),
  id: asset._id.toString(),
  createdBy: asset.createdBy?.toString?.() ?? null,
})

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = getServerTFromNextRequest(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const limitParam = Number(searchParams.get('limit'))
    const resourceTypeParam = searchParams.get('resourceType')
    const resourceType =
      resourceTypeParam && Object.values(MediaResourceType).includes(resourceTypeParam as MediaResourceType)
        ? (resourceTypeParam as MediaResourceType)
        : undefined

    const items = await listMediaAssets({
      resourceType,
      limit: Number.isFinite(limitParam) ? limitParam : undefined,
    })

    return response.json({
      items: items.map(mapAsset),
    })
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
