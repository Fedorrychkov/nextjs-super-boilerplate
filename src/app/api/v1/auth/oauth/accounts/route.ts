import { OAUTH_CONFIG } from '@config/auth-oauth'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { countOAuthAccountsForUser, listOAuthAccountsForUser, userHasPassword } from '@lib/oauth/oauth-account.service'
import type { AuthSuccessResult } from '@lib/security/auth'
import { NextRequest, NextResponse } from 'next/server'

const handlerGet = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const userId = authResult.payload.sub
    const [accounts, hasPassword, oauthCount] = await Promise.all([
      listOAuthAccountsForUser(userId),
      userHasPassword(userId),
      countOAuthAccountsForUser(userId),
    ])

    return response.json({
      accounts,
      hasPassword,
      oauthCount,
      linkProviders: OAUTH_CONFIG.getPublicProvidersForContext('link'),
      uiMode: OAUTH_CONFIG.publicUiMode,
    })
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handlerGet))
