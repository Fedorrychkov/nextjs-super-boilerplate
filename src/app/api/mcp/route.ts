import { API_TOKENS_CONFIG, APP_INTERNAL_ORIGIN, MCP_OAUTH_CONFIG } from '@config/env'
import { withGlobalRateLimit } from '@lib/middleware'
import { verifyApiToken } from '@lib/services/api-token.service'
import { recordApiTokenUsage } from '@lib/services/machine-access.service'
import { handleMcpMessage, type JsonRpcMessage, type JsonRpcResponse } from '@mcp/handler'
import { NsbApiClient } from '@mcp/http'
import type { McpToolContext } from '@mcp/registry'
import { allTools } from '@mcp/tools'
import { NextRequest, NextResponse } from 'next/server'

import { API_TOKEN_PREFIX, isApiTokenBearer } from '~/api/api-token'

/**
 * Remote MCP endpoint — Streamable HTTP transport in stateless JSON mode.
 *
 * Platform users (any role allowed by the role policies) connect with just a URL + PAT,
 * no repo checkout needed:
 *
 *   { "mcpServers": { "nsb-mcp": { "url": "https://site.com/api/mcp",
 *     "headers": { "Authorization": "Bearer nsb_pat_…" } } } }
 *
 * Every POST carries one JSON-RPC message (or a batch) and is fully independent — no sessions,
 * no SSE stream. Tools are the same registry as the stdio server (`mcp/tools`); they call the
 * app's own REST API with the caller's PAT, so scopes, role policies, per-token rate limits and
 * audit are enforced exactly as for any other machine request. Errors here are plain English on
 * purpose: the client is a machine, not a browser session with a locale.
 */

const serverInfo = { name: API_TOKENS_CONFIG.mcpServerName, version: '1.0.0' }

function resolvePublicOrigin(request: NextRequest): string {
  const host = request.headers.get('host') || request.nextUrl.host
  const protocol = request.headers.get('x-forwarded-proto') || (request.nextUrl.protocol ? request.nextUrl.protocol.replace(':', '') : 'https')

  return `${protocol}://${host}`
}

const handler = async (request: NextRequest): Promise<NextResponse> => {
  if (!API_TOKENS_CONFIG.enabled) {
    return NextResponse.json({ message: 'API tokens / MCP are disabled on this server' }, { status: 404 })
  }

  const header = request.headers.get('Authorization')
  const bearer = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null

  // RFC 9728: point OAuth-capable hosts (Claude.ai/Desktop custom connectors) at the protected
  // resource metadata so they can discover the authorization server and run the OAuth flow.
  const unauthorizedHeaders = (origin: string): Record<string, string> => ({
    'WWW-Authenticate': MCP_OAUTH_CONFIG.enabled ? `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"` : 'Bearer',
  })

  if (!isApiTokenBearer(bearer)) {
    return NextResponse.json(
      { message: `Authorization: Bearer <token> is required (a ${API_TOKEN_PREFIX}… personal access token or an OAuth access token)` },
      { status: 401, headers: unauthorizedHeaders(resolvePublicOrigin(request)) },
    )
  }

  // Early verification: reject invalid/revoked/expired tokens and disabled role policies before
  // touching JSON-RPC. Scopes are enforced later, per tool call, by the REST layer.
  const verified = await verifyApiToken(bearer)

  if (!verified.ok) {
    return NextResponse.json({ message: `Invalid API token (${verified.reason})` }, { status: 401, headers: unauthorizedHeaders(resolvePublicOrigin(request)) })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error: body must be JSON' } }, { status: 400 })
  }

  const publicOrigin = resolvePublicOrigin(request)

  const ctx: McpToolContext = {
    // Tools call our own REST API: internal origin avoids a public round-trip (Docker-friendly).
    api: new NsbApiClient({ baseUrl: APP_INTERNAL_ORIGIN || publicOrigin, token: bearer, serverName: serverInfo.name }),
    // Preview/public URLs in tool responses must use the public origin.
    baseUrl: publicOrigin,
  }

  const messages = (Array.isArray(body) ? body : [body]) as JsonRpcMessage[]
  const responses: JsonRpcResponse[] = []

  for (const message of messages) {
    // Usage time series: one event per tool call (the tool's internal REST request records its own `rest` event).
    if (message && typeof message === 'object' && message.method === 'tools/call') {
      recordApiTokenUsage({
        tokenId: verified.value.token._id.toString(),
        ownerUserId: verified.value.owner._id.toString(),
        kind: verified.value.token.kind || 'pat',
        transport: 'mcp',
        method: 'POST',
        path: '/api/mcp',
        tool: typeof (message.params as { name?: unknown } | undefined)?.name === 'string' ? String((message.params as { name?: unknown }).name) : null,
      })
    }

    const result = await handleMcpMessage(message, { tools: allTools, ctx, serverInfo })

    if (result) {
      responses.push(result)
    }
  }

  // Only notifications/responses in the batch → acknowledge without a body (Streamable HTTP spec).
  if (!responses.length) {
    return new NextResponse(null, { status: 202 })
  }

  return NextResponse.json(Array.isArray(body) ? responses : responses[0])
}

export const POST = withGlobalRateLimit(handler)

// Stateless mode: no server-initiated SSE stream and no sessions to delete.
export const GET = async () =>
  NextResponse.json({ message: 'Method not allowed: this MCP endpoint is stateless, use POST' }, { status: 405, headers: { Allow: 'POST' } })

export const DELETE = GET
