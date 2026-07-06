import { API_TOKENS_CONFIG } from '@config/env'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { getApiTokenPermissionsForRole, issueApiToken } from '@lib/services/api-token.service'
import { NextRequest, NextResponse } from 'next/server'

import type { ApiTokenCreatedModel, ApiTokenCreatePayload } from '~/api/api-token'
import { clampExpiresDays, filterApiTokenScopes } from '~/api/api-token/permissions'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (!API_TOKENS_CONFIG.enabled) {
      return NextResponse.json({ message: t('apiTokens.errors.disabled') }, { status: 404 })
    }

    // Role policy driven: admins are always allowed; other roles need an enabled policy (/admin/api-tokens).
    const permissions = await getApiTokenPermissionsForRole(authResult.payload.role)

    if (!permissions.allowed || !permissions.allowedKinds.includes('pat')) {
      return NextResponse.json({ message: t('apiTokens.errors.notAllowedForRole') }, { status: 403 })
    }

    const body = (await request.json()) as Partial<ApiTokenCreatePayload>

    const name = typeof body.name === 'string' ? body.name.trim() : ''

    if (!name) {
      return NextResponse.json({ message: t('apiTokens.errors.nameRequired') }, { status: 400 })
    }

    // Requested scopes are intersected with what the caller's role policy allows.
    const scopes = filterApiTokenScopes(Array.isArray(body.scopes) ? body.scopes.map(String) : [], permissions.allowedScopes)

    if (!scopes.length) {
      return NextResponse.json({ message: t('apiTokens.errors.scopesRequired') }, { status: 400 })
    }

    const { rawToken, item } = await issueApiToken({
      name,
      ownerUserId: authResult.payload.sub,
      scopes,
      expiresInDays: clampExpiresDays(typeof body.expiresInDays === 'number' ? body.expiresInDays : undefined, permissions.maxExpiresDays),
      createdBy: authResult.payload.sub,
    })

    const data: ApiTokenCreatedModel = { item, token: rawToken }

    return response.json(data)
  })

export const POST = withGlobalRateLimit(withAuthMiddleware(handler))
