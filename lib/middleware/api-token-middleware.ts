import { API_TOKENS_CONFIG } from '@config/env'
import { authMiddleware, AuthSuccessResult } from '@lib/security/auth'
import { rateLimit } from '@lib/security/rate-limit'
import { verifyApiToken } from '@lib/services/api-token.service'
import { recordApiTokenUsage } from '@lib/services/machine-access.service'
import { recordSecurityAuditEvent } from '@lib/services/security-audit.service'
import { NextRequest, NextResponse } from 'next/server'

import { type ApiTokenScope, isApiTokenBearer } from '~/api/api-token'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'
import { Logger } from '~/utils/logger'

import type { RouteHandlerContext } from './auth-middleware'

const logger = new Logger(['withApiTokenOrAuth', '[lib/middleware/api-token-middleware.ts]'])

type AuthHandler = (request: NextRequest, auth: AuthSuccessResult, context?: RouteHandlerContext) => Promise<NextResponse>

function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get('Authorization')

  if (!header?.startsWith('Bearer ')) {
    return null
  }

  return header.slice('Bearer '.length).trim()
}

/** True when the request is authorized via PAT and the token carries the scope (JWT users are unaffected). */
export function hasApiTokenScope(auth: AuthSuccessResult, scope: ApiTokenScope): boolean {
  if (!auth.apiToken) {
    return true
  }

  return auth.apiToken.scopes.includes(scope)
}

/**
 * Machine-or-human auth wrapper.
 *
 * `Authorization: Bearer nsb_pat_…` → Personal Access Token path: verify, check `scope`,
 * per-token rate-limit, audit. Anything else → delegates to the regular `authMiddleware` (JWT),
 * where scopes do not apply (humans are limited by roles).
 *
 * Usage: `export const POST = withGlobalRateLimit(withApiTokenOrAuth('articles:write')(handler))`
 */
export const withApiTokenOrAuth = (scope: ApiTokenScope | null) => {
  return (handler: AuthHandler): ((request: NextRequest, context: RouteHandlerContext) => Promise<NextResponse>) => {
    return async (request: NextRequest, context: RouteHandlerContext) => {
      const bearer = getBearerToken(request)

      if (!isApiTokenBearer(bearer)) {
        const authResult = await authMiddleware(request)

        if (!authResult.success) {
          return authResult.response
        }

        return handler(request, authResult, context)
      }

      const { t } = await getServerTFromNextRequestAsync(request)

      if (!API_TOKENS_CONFIG.enabled) {
        return NextResponse.json({ message: t('apiTokens.errors.disabled') }, { status: 404 })
      }

      const verified = await verifyApiToken(bearer)

      if (!verified.ok) {
        logger.warn('PAT rejected', { reason: verified.reason })

        return NextResponse.json({ message: t('apiTokens.errors.invalidToken') }, { status: 401 })
      }

      // `effectiveRole`/`effectiveScopes`: owner demotion and role-policy changes apply to existing tokens instantly.
      const { token, owner, effectiveRole, effectiveScopes } = verified.value
      const tokenId = token._id.toString()

      // Stricter, per-token rate limit (points shared with the global limiter config, but keyed by token).
      try {
        await rateLimit.consume(`pat:${tokenId}`, 2)
      } catch {
        return NextResponse.json({ message: t('errors.tooManyRequests') }, { status: 429 })
      }

      if (scope && !effectiveScopes.includes(scope)) {
        void recordSecurityAuditEvent({
          action: 'api_token_denied',
          actorUserId: owner._id.toString(),
          targetUserId: owner._id.toString(),
          metadata: { tokenId, scope, method: request.method, path: request.nextUrl.pathname },
        }).catch(() => undefined)

        return NextResponse.json({ message: t('apiTokens.errors.missingScope', { scope }) }, { status: 403 })
      }

      // Full usage time series for the admin machine-access view (fire-and-forget, TTL-bounded).
      recordApiTokenUsage({
        tokenId,
        ownerUserId: owner._id.toString(),
        kind: token.kind || 'pat',
        transport: 'rest',
        method: request.method,
        path: request.nextUrl.pathname,
      })

      // Audit write actions; reads are covered by rate-limit + lastUsedAt.
      if (request.method !== 'GET') {
        void recordSecurityAuditEvent({
          action: 'api_token_request',
          actorUserId: owner._id.toString(),
          targetUserId: owner._id.toString(),
          metadata: { tokenId, scope: scope ?? null, method: request.method, path: request.nextUrl.pathname },
        }).catch(() => undefined)
      }

      const requestHeaders = new Headers(request.headers)

      requestHeaders.set('x-user-id', owner._id.toString())
      requestHeaders.set('x-user-email', owner.email)
      requestHeaders.set('x-user-role', effectiveRole)
      requestHeaders.set('x-api-token-id', tokenId)

      const authResult: AuthSuccessResult = {
        success: true,
        payload: {
          sub: owner._id.toString(),
          email: owner.email,
          role: effectiveRole,
          status: owner.status,
        },
        response: NextResponse.next({ request: { headers: requestHeaders } }),
        apiToken: {
          id: tokenId,
          scopes: effectiveScopes,
        },
      }

      return handler(request, authResult, context)
    }
  }
}
