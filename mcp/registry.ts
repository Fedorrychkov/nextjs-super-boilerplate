import type { ApiTokenScope } from '../src/api/api-token/model'
import type { NsbApiClient } from './http'

/**
 * MCP tool registry — the extensibility backbone of the MCP server.
 *
 * Each domain lives in its own `mcp/tools/<domain>.mcp.ts` file exporting `McpToolDefinition[]`,
 * aggregated in `mcp/tools/index.ts`. To add a new business domain in a downstream project:
 *
 * 1. Add the domain scopes to `src/api/api-token/model.ts` (`API_TOKEN_SCOPES`).
 * 2. Wrap the domain REST routes with `withApiTokenOrAuth('<scope>')`.
 * 3. Create `mcp/tools/<domain>.mcp.ts` with tools mapping onto those routes.
 * 4. Register the export in `mcp/tools/index.ts`.
 *
 * Tools never contain business logic — they translate arguments into `/api/v1/*` calls,
 * so authorization, validation, audit and rate limits are always enforced server-side.
 */
export type McpToolContext = {
  api: NsbApiClient
  /** Site origin, useful for building preview/public URLs in tool responses. */
  baseUrl: string
}

export type McpToolResult = {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}

export type McpToolDefinition = {
  name: string
  /** Shown to the model — include the required scope so agents can explain 403s. */
  description: string
  /** PAT scope required by the underlying REST endpoint (documentation; enforcement is server-side). */
  scope: ApiTokenScope | null
  /** JSON Schema for tool arguments. */
  inputSchema: Record<string, unknown>
  handler: (args: Record<string, unknown>, ctx: McpToolContext) => Promise<McpToolResult>
}

export function textResult(value: unknown): McpToolResult {
  return {
    content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
  }
}

export function errorResult(message: string): McpToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  }
}
