import { MCP_OAUTH_CONFIG } from '@config/env'
import { withGlobalRateLimit } from '@lib/middleware'
import { revokeMcpToken } from '@lib/services/mcp-oauth.service'
import { NextRequest, NextResponse } from 'next/server'

/**
 * RFC 7009 token revocation. Called by the host when the user deletes the connector in the
 * Claude UI — the grant and its access token die immediately instead of waiting for expiry.
 * Always 200 regardless of whether the token existed (per spec: do not leak token validity).
 */
const handler = async (request: NextRequest): Promise<NextResponse> => {
  if (!MCP_OAUTH_CONFIG.enabled) {
    return NextResponse.json({ message: 'MCP OAuth is disabled on this server' }, { status: 404 })
  }

  let form: URLSearchParams

  try {
    form = new URLSearchParams(await request.text())
  } catch {
    return NextResponse.json({ error: 'invalid_request', error_description: 'body must be application/x-www-form-urlencoded' }, { status: 400 })
  }

  const token = form.get('token')

  if (token) {
    await revokeMcpToken(token).catch(() => undefined)
  }

  return NextResponse.json({})
}

export const POST = withGlobalRateLimit(handler)
