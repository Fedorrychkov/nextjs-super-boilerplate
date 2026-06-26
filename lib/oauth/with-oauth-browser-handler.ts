import { NextRequest, NextResponse } from 'next/server'

import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'
import { Logger } from '~/utils/logger'

import { buildOAuthErrorPageUrl, type OAuthBrowserIntent, resolveOAuthBrowserErrorCode } from './oauth-browser-errors'

const logger = new Logger(['withOAuthBrowserHandler', '[lib/oauth/with-oauth-browser-handler.ts]'])

/** OAuth start/callback — browser GET: on error redirect to UI, not JSON. */
export async function withOAuthBrowserHandler(request: NextRequest, intent: OAuthBrowserIntent, handler: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await handler()
  } catch (error) {
    const { t } = await getServerTFromNextRequestAsync(request)
    const { code, retryAfterSec } = resolveOAuthBrowserErrorCode(error, t)

    logger.warn('OAuth browser handler error', {
      intent,
      code,
      url: request.nextUrl.toString(),
      message: error instanceof Error ? error.message : String(error),
    })

    return NextResponse.redirect(buildOAuthErrorPageUrl({ intent, code, retryAfterSec }))
  }
}
