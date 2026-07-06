import { MCP_OAUTH_CONFIG } from '@config/env'
import { buildProtectedResourceMetadata, resolvePublicOriginFromHeaders } from '@lib/services/mcp-oauth.metadata'
import { NextRequest, NextResponse } from 'next/server'

/**
 * RFC 9728 Protected Resource Metadata for the remote MCP endpoint (`/api/mcp`).
 * OAuth-capable MCP hosts (Claude.ai/Desktop) discover the authorization server through this document.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!MCP_OAUTH_CONFIG.enabled) {
    return NextResponse.json({ message: 'MCP OAuth is disabled on this server' }, { status: 404 })
  }

  const origin = resolvePublicOriginFromHeaders(request.headers, request.nextUrl.host, request.nextUrl.protocol.replace(':', '') || 'https')

  return NextResponse.json(buildProtectedResourceMetadata(origin), {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  })
}
