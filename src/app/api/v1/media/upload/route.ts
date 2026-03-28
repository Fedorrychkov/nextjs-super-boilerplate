import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { createMediaAsset } from '@lib/services/media.service'
import { NextRequest, NextResponse } from 'next/server'

import { MediaResourceType } from '~/api/media'
import { UserRole } from '~/api/user'
import { formatDataSizeShort, formatMediaUploadMaxLabel, isMediaFileWithinUploadLimit } from '~/constants/media-upload'
import { getServerTFromNextRequest } from '~/lib/i18n/server'

const mapAsset = (asset: any) => ({
  ...asset.toObject(),
  id: asset._id.toString(),
  createdBy: asset.createdBy?.toString?.() ?? null,
})

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t, locale } = getServerTFromNextRequest(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const resourceTypeRaw = formData.get('resourceType')
    const resourceType = typeof resourceTypeRaw === 'string' ? (resourceTypeRaw as MediaResourceType) : undefined

    if (!(file instanceof File)) {
      return NextResponse.json({ message: t('media.errors.fileRequired') }, { status: 400 })
    }

    if (!isMediaFileWithinUploadLimit(file)) {
      return NextResponse.json(
        {
          message: t('media.errors.fileExceedsMaxSize', {
            size: formatDataSizeShort(file.size, locale),
            maxLabel: formatMediaUploadMaxLabel(locale),
          }),
        },
        { status: 413 },
      )
    }

    const asset = await createMediaAsset({
      file,
      createdBy: authResult.payload.sub,
      resourceType,
    })

    return response.json({
      asset: mapAsset(asset),
      proxyUrl: asset?.proxyPath ?? '',
    })
  })

export const POST = withGlobalRateLimit(withAuthMiddleware(handler))
