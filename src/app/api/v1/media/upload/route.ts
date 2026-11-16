import { apiErrorHandlerContainer, withApiTokenOrAuth, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { createMediaAsset, toMediaAssetDto } from '@lib/services/media.service'
import { NextRequest, NextResponse } from 'next/server'

import { MediaPurpose, MediaResourceType } from '~/api/media'
import { UserRole } from '~/api/user'
import { formatDataSizeShort, formatMediaUploadMaxLabel, isMediaFileWithinUploadLimit, MEDIA_UPLOAD_MAX_BYTES } from '~/constants/media-upload'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'
import { decideUploadMime, SIGNATURE_HEAD_BYTES, sniffFileMime } from '~/lib/security/fileSignature'
import { checkContentLength } from '~/lib/security/uploadContentLength'

const RESOURCE_TYPES = new Set<string>(Object.values(MediaResourceType))

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t, locale } = await getServerTFromNextRequestAsync(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    // Before formData(): that call buffers the whole body, so a size check after it protects nothing.
    if (checkContentLength(request.headers, MEDIA_UPLOAD_MAX_BYTES) === 'too_large') {
      return NextResponse.json(
        {
          message: t('media.errors.fileExceedsMaxSize', {
            size: formatDataSizeShort(Number(request.headers.get('content-length')), locale),
            maxLabel: formatMediaUploadMaxLabel(locale),
          }),
        },
        { status: 413 },
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const resourceTypeRaw = formData.get('resourceType')
    const resourceType = typeof resourceTypeRaw === 'string' && RESOURCE_TYPES.has(resourceTypeRaw) ? (resourceTypeRaw as MediaResourceType) : undefined

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

    // `file.type` is whatever the client wrote into the form; the bytes decide.
    const head = new Uint8Array(await file.slice(0, SIGNATURE_HEAD_BYTES).arrayBuffer())
    const decision = decideUploadMime({ declaredType: file.type || null, resourceType, sniffed: sniffFileMime(head) })

    if (!decision.ok) {
      return NextResponse.json({ message: t('media.errors.unsupportedFileType'), reason: decision.reason }, { status: 415 })
    }

    const asset = await createMediaAsset({
      file,
      createdBy: authResult.payload.sub,
      resourceType,
      expectedMime: decision.mime,
      purpose: MediaPurpose.CMS,
    })

    return response.json({
      asset: toMediaAssetDto(asset),
      proxyUrl: asset?.proxyPath ?? '',
    })
  })

export const POST = withGlobalRateLimit(withApiTokenOrAuth('media:write')(handler))
