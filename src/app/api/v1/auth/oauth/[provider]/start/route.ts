import type { OAuthProviderId } from '@config/auth-oauth'
import { ValidationError } from '@lib/error/custom-errors'
import { apiErrorHandlerContainer, RouteHandlerContext, withGlobalRateLimit } from '@lib/middleware'
import { assertOAuthFlow } from '@lib/oauth/oauth-flow.service'
import { buildOAuthStartRedirect } from '@lib/oauth/oauth-start.service'
import { isKnownOAuthProvider } from '@lib/oauth/registry'
import { NextRequest, NextResponse } from 'next/server'

const handler = (request: NextRequest, context: RouteHandlerContext) =>
  apiErrorHandlerContainer(request)(async () => {
    const paramsData = await context.params
    const providerRaw = typeof paramsData.provider === 'string' ? paramsData.provider : undefined

    if (!providerRaw || !isKnownOAuthProvider(providerRaw)) {
      throw new ValidationError('Unknown OAuth provider')
    }

    const provider = providerRaw.toLowerCase() as OAuthProviderId
    const flow = assertOAuthFlow(request.nextUrl.searchParams.get('flow'))
    const nextPath = request.nextUrl.searchParams.get('nextPath')

    const url = await buildOAuthStartRedirect({
      provider,
      flow,
      nextPath,
    })

    return NextResponse.redirect(url)
  })

export const GET = withGlobalRateLimit(handler)
