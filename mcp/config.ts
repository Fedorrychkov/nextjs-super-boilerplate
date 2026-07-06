/**
 * MCP server configuration — read from the host's env (Claude Desktop / Cursor config `env` block).
 *
 * Required:
 * - `NSB_API_BASE_URL` — deployed app origin, e.g. `https://example.com` (or `http://localhost:3000` for dev).
 * - `NSB_API_TOKEN`    — Personal Access Token issued at `/admin/api-tokens` (format `nsb_pat_…`).
 */
export type McpConfig = {
  baseUrl: string
  token: string
  /** Server name reported to the MCP host (`serverInfo.name`); brand it per project, e.g. `quickping-mcp`. */
  serverName: string
}

export const MCP_DEFAULT_SERVER_NAME = 'nsb-mcp'

export function loadMcpConfig(): McpConfig {
  const baseUrl = (process.env.NSB_API_BASE_URL || '').trim().replace(/\/+$/, '')
  const token = (process.env.NSB_API_TOKEN || '').trim()
  const serverName = (process.env.MCP_SERVER_NAME || '').trim() || MCP_DEFAULT_SERVER_NAME

  if (!baseUrl) {
    throw new Error('NSB_API_BASE_URL is required (e.g. https://your-site.com). Set it in the MCP server env config.')
  }

  if (!token) {
    throw new Error('NSB_API_TOKEN is required. Create a Personal Access Token at /admin/api-tokens (requires API_TOKENS_ENABLED=1).')
  }

  return { baseUrl, token, serverName }
}
