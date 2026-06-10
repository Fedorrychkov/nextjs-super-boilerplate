import type { OAuthProviderId } from '@config/auth-oauth'
import { ValidationError } from '@lib/error/custom-errors'
import { apiErrorHandlerContainer, RouteHandlerContext, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { countOAuthAccountsForUser, deleteOAuthAccountForUser, userHasPassword } from '@lib/oauth/oauth-account.service'
import { isKnownOAuthProvider } from '@lib/oauth/registry'
import type { AuthSuccessResult } from '@lib/security/auth'
import { NextRequest, NextResponse } from 'next/server'

import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handlerDelete = (request: NextRequest, authResult: AuthSuccessResult, context?: RouteHandlerContext) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)
    const paramsData = context ? await context.params : undefined
    const providerRaw = typeof paramsData?.provider === 'string' ? paramsData.provider : undefined

    if (!providerRaw || !isKnownOAuthProvider(providerRaw)) {
      throw new ValidationError(t('auth.oauth.errors.unknownProvider'))
    }

    const provider = providerRaw.toLowerCase() as OAuthProviderId
    const userId = authResult.payload.sub
    const [hasPassword, oauthCount] = await Promise.all([userHasPassword(userId), countOAuthAccountsForUser(userId)])

    if (!hasPassword && oauthCount <= 1) {
      throw new ValidationError(t('auth.oauth.errors.cannotUnlinkLastMethod'))
    }

    const removed = await deleteOAuthAccountForUser(userId, provider)

    if (!removed) {
      throw new ValidationError(t('auth.oauth.errors.accountNotLinked'))
    }

    return response.json({ success: true })
  })

export const DELETE = withGlobalRateLimit(withAuthMiddleware(handlerDelete))
