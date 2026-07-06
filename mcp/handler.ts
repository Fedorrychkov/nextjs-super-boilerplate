import { NsbApiError } from './http'
import type { McpToolContext, McpToolDefinition, McpToolResult } from './registry'

/**
 * Transport-agnostic MCP JSON-RPC dispatcher.
 *
 * Used by both entry points:
 * - `mcp/server.ts` — stdio (local dev / self-hosted), via the SDK transport;
 * - `src/app/api/mcp/route.ts` — remote Streamable HTTP (stateless JSON mode): every POST
 *   is handled independently, so platform users connect with just a URL + PAT, no repo checkout.
 *
 * Only the methods MCP hosts actually need for a tools-only server are implemented:
 * initialize / ping / tools/list / tools/call; notifications are acknowledged silently.
 */

export const MCP_SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'] as const
export const MCP_DEFAULT_PROTOCOL_VERSION = '2025-03-26'

export type JsonRpcId = string | number | null

export type JsonRpcMessage = {
  jsonrpc?: string
  id?: JsonRpcId
  method?: string
  params?: Record<string, unknown>
  result?: unknown
  error?: unknown
}

export type JsonRpcResponse = {
  jsonrpc: '2.0'
  id: JsonRpcId
  result?: unknown
  error?: { code: number; message: string }
}

export type McpServerInfo = {
  name: string
  version: string
}

const response = (id: JsonRpcId, result: unknown): JsonRpcResponse => ({ jsonrpc: '2.0', id, result })
const errorResponse = (id: JsonRpcId, code: number, message: string): JsonRpcResponse => ({ jsonrpc: '2.0', id, error: { code, message } })

/** Shared tools/call execution with the same error mapping for stdio and HTTP transports. */
export async function executeToolCall(
  tools: readonly McpToolDefinition[],
  name: string,
  args: Record<string, unknown>,
  ctx: McpToolContext,
): Promise<McpToolResult> {
  const tool = tools.find((item) => item.name === name)

  if (!tool) {
    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true }
  }

  try {
    return await tool.handler(args ?? {}, ctx)
  } catch (error) {
    if (error instanceof NsbApiError) {
      const scopeHint =
        error.status === 403 && tool.scope ? ` The token likely misses the "${tool.scope}" scope — an admin can grant it at /admin/api-tokens.` : ''

      return {
        content: [{ type: 'text', text: `API error ${error.status}: ${error.message}.${scopeHint}` }],
        isError: true,
      }
    }

    return {
      content: [{ type: 'text', text: `Tool failed: ${error instanceof Error ? error.message : 'unknown error'}` }],
      isError: true,
    }
  }
}

/**
 * Handles a single JSON-RPC message. Returns `null` for notifications and client responses
 * (nothing to send back — the HTTP layer replies 202 in that case).
 */
export async function handleMcpMessage(
  message: JsonRpcMessage,
  options: { tools: readonly McpToolDefinition[]; ctx: McpToolContext; serverInfo: McpServerInfo },
): Promise<JsonRpcResponse | null> {
  if (!message || typeof message !== 'object' || message.jsonrpc !== '2.0') {
    return errorResponse(message?.id ?? null, -32600, 'Invalid Request: expected a JSON-RPC 2.0 message')
  }

  // A response from the client (has result/error, no method) — nothing to do in stateless mode.
  if (typeof message.method !== 'string') {
    return null
  }

  const isNotification = message.id === undefined || message.method.startsWith('notifications/')

  if (isNotification) {
    return null
  }

  const id = message.id as JsonRpcId
  const params = (message.params ?? {}) as Record<string, unknown>

  switch (message.method) {
    case 'initialize': {
      const requested = typeof params.protocolVersion === 'string' ? params.protocolVersion : ''
      const protocolVersion = (MCP_SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(requested) ? requested : MCP_DEFAULT_PROTOCOL_VERSION

      return response(id, {
        protocolVersion,
        capabilities: { tools: {} },
        serverInfo: options.serverInfo,
      })
    }

    case 'ping':
      return response(id, {})

    case 'tools/list':
      return response(id, {
        tools: options.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      })

    case 'tools/call': {
      const name = typeof params.name === 'string' ? params.name : ''
      const args = (params.arguments ?? {}) as Record<string, unknown>

      return response(id, await executeToolCall(options.tools, name, args, options.ctx))
    }

    default:
      return errorResponse(id, -32601, `Method not found: ${message.method}`)
  }
}
