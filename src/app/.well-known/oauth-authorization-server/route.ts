import { MCP_OAUTH_CONFIG } from '@config/env'
import { buildAuthorizationServerMetadata, resolvePublicOriginFromHeaders } from '@lib/services/mcp-oauth.metadata'
import { NextRequest, NextResponse } from 'next/server'

/**
 * RFC 8414 Authorization Server Metadata. The app is its own authorization server for the MCP
 * contour: authorize/token/register/revoke endpoints all live here, tokens are regular ApiTokens.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!MCP_OAUTH_CONFIG.enabled) {
    return NextResponse.json({ message: 'MCP OAuth is disabled on this server' }, { status: 404 })
  }

  const origin = resolvePublicOriginFromHeaders(request.headers, request.nextUrl.host, request.nextUrl.protocol.replace(':', '') || 'https')

  return NextResponse.json(buildAuthorizationServerMetadata(origin), {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  })
}
