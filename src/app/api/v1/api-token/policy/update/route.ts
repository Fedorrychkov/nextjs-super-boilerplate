import { API_TOKENS_CONFIG } from '@config/env'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { upsertApiTokenRolePolicy } from '@lib/services/api-token.service'
import { NextRequest, NextResponse } from 'next/server'

import type { ApiTokenRolePolicyUpdatePayload } from '~/api/api-token'
import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (!API_TOKENS_CONFIG.enabled) {
      return NextResponse.json({ message: t('apiTokens.errors.disabled') }, { status: 404 })
    }

    if (![UserRole.ADMIN].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const body = (await request.json()) as Partial<ApiTokenRolePolicyUpdatePayload>

    const role = typeof body.role === 'string' ? body.role.trim().toLowerCase() : ''

    if (!role) {
      return NextResponse.json({ message: t('apiTokens.errors.policyRoleRequired') }, { status: 400 })
    }

    // Admins are always fully allowed — their policy is not editable.
    if (role === UserRole.ADMIN) {
      return NextResponse.json({ message: t('apiTokens.errors.policyAdminImmutable') }, { status: 400 })
    }

    const enabled = body.enabled === true
    const allowedScopes = Array.isArray(body.allowedScopes) ? body.allowedScopes.map(String) : []

    const data = await upsertApiTokenRolePolicy({
      role,
      enabled,
      allowedScopes,
      allowedKinds: Array.isArray(body.allowedKinds) ? body.allowedKinds.map(String) : undefined,
      maxExpiresDays: typeof body.maxExpiresDays === 'number' ? body.maxExpiresDays : undefined,
      actorUserId: authResult.payload.sub,
    })

    return response.json(data)
  })

export const PUT = withGlobalRateLimit(withAuthMiddleware(handler))
