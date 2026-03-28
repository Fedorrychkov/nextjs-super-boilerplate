import { LLM_CONFIG } from '@config/env'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { getChatModelAllowlist } from '@lib/services/llm/chat-models'
import { buildImageModelsPayloadForClient } from '@lib/services/llm/image-models'
import { NextRequest, NextResponse } from 'next/server'

import { UserRole } from '~/api/user'
import { getServerTFromNextRequest } from '~/lib/i18n/server'

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = getServerTFromNextRequest(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const enabled = !!LLM_CONFIG.enabled && !!LLM_CONFIG.apiKey?.trim()
    const models = getChatModelAllowlist().map((id) => ({ id, label: id }))

    return response.json({
      enabled,
      chat: { models },
      audit: { models },
      image: { models: buildImageModelsPayloadForClient() },
    })
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
