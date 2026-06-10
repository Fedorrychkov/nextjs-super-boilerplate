import type { OAuthProviderId } from '@config/auth-oauth'
import { ValidationError } from '@lib/error/custom-errors'
import { apiErrorHandlerContainer, RouteHandlerContext, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { buildOAuthStartRedirect } from '@lib/oauth/oauth-start.service'
import { isKnownOAuthProvider } from '@lib/oauth/registry'
import type { AuthSuccessResult } from '@lib/security/auth'
import { NextRequest, NextResponse } from 'next/server'

const handlerGet = (request: NextRequest, authResult: AuthSuccessResult, context?: RouteHandlerContext) =>
  apiErrorHandlerContainer(request)(async () => {
    const paramsData = context ? await context.params : undefined
    const providerRaw = typeof paramsData?.provider === 'string' ? paramsData.provider : undefined

    if (!providerRaw || !isKnownOAuthProvider(providerRaw)) {
      throw new ValidationError('Unknown OAuth provider')
    }

    const provider = providerRaw.toLowerCase() as OAuthProviderId
    const url = await buildOAuthStartRedirect({
      provider,
      flow: 'link',
      actorUserId: authResult.payload.sub,
    })

    return NextResponse.redirect(url)
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handlerGet))
