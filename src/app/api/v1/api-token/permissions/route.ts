import { API_TOKENS_CONFIG, MCP_OAUTH_CONFIG } from '@config/env'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { getApiTokenPermissionsForRole } from '@lib/services/api-token.service'
import { NextRequest, NextResponse } from 'next/server'

import type { ApiTokenPermissionsModel } from '~/api/api-token'

/** Effective PAT permissions of the current user — drives nav visibility and the token creation form. */
const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    if (!API_TOKENS_CONFIG.enabled) {
      const data: ApiTokenPermissionsModel = {
        enabled: false,
        mcpOauthEnabled: false,
        allowed: false,
        isAdmin: false,
        role: authResult.payload.role,
        allowedScopes: [],
        allowedKinds: [],
        maxExpiresDays: 0,
      }

      return response.json(data)
    }

    const permissions = await getApiTokenPermissionsForRole(authResult.payload.role)

    const data: ApiTokenPermissionsModel = { enabled: true, mcpOauthEnabled: MCP_OAUTH_CONFIG.enabled, ...permissions }

    return response.json(data)
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
