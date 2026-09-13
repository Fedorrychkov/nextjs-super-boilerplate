import { apiErrorHandlerContainer, withApiTokenOrAuth, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { listMediaAssets, toMediaAssetDto } from '@lib/services/media.service'
import { NextRequest, NextResponse } from 'next/server'

import { MediaResourceType } from '~/api/media'
import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

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
      items: items.map(toMediaAssetDto),
    })
  })

export const GET = withGlobalRateLimit(withApiTokenOrAuth('media:read')(handler))
