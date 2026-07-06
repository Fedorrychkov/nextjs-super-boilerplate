#!/usr/bin/env node
/**
 * MCP stdio server — machine access to the app for AI agents (Claude Desktop, Cursor, Claude Code, …).
 *
 * The host launches this process locally and talks JSON-RPC over stdio; every tool call is
 * translated into a REST request to `/api/v1/*` authorized by a Personal Access Token,
 * so scopes, rate limits and audit are enforced by the backend, not by this process.
 *
 * Run: `pnpm mcp` (dev) or `npx tsx mcp/server.ts`. See `mcp/README.md` for host config.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'

import { loadMcpConfig } from './config'
import { executeToolCall } from './handler'
import { NsbApiClient } from './http'
import type { McpToolContext } from './registry'
import { allTools } from './tools'

async function main() {
  const config = loadMcpConfig()

  const ctx: McpToolContext = {
    api: new NsbApiClient(config),
    baseUrl: config.baseUrl,
  }

  const server = new Server(
    {
      name: config.serverName,
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return executeToolCall(allTools, request.params.name, (request.params.arguments as Record<string, unknown>) ?? {}, ctx)
  })

  const transport = new StdioServerTransport()

  await server.connect(transport)

  // Never write to stdout directly — it is the JSON-RPC channel; use stderr for diagnostics.
  console.error(`[mcp] ${config.serverName} MCP server ready (${allTools.length} tools, api: ${config.baseUrl})`)
}

main().catch((error) => {
  console.error('[mcp] fatal:', error instanceof Error ? error.message : error)
  process.exit(1)
})
