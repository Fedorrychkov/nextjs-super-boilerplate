import assert from 'node:assert/strict'
import test from 'node:test'

import { executeToolCall, handleMcpMessage, type JsonRpcMessage, MCP_DEFAULT_PROTOCOL_VERSION } from './handler'
import { NsbApiError } from './http'
import type { McpToolContext, McpToolDefinition } from './registry'

const ctx = { api: {}, baseUrl: 'https://example.com' } as unknown as McpToolContext

const serverInfo = { name: 'nsb-mcp', version: '1.0.0' }

const tools: McpToolDefinition[] = [
  {
    name: 'echo',
    description: 'Echoes the input. Requires scope articles:read.',
    scope: 'articles:read',
    inputSchema: { type: 'object', properties: { value: { type: 'string' } } },
    handler: async (args) => ({ content: [{ type: 'text', text: String(args.value ?? '') }] }),
  },
  {
    name: 'forbidden',
    description: 'Always fails with 403.',
    scope: 'articles:publish',
    inputSchema: { type: 'object' },
    handler: async () => {
      throw new NsbApiError(403, 'missing scope')
    },
  },
]

const call = (message: JsonRpcMessage) => handleMcpMessage(message, { tools, ctx, serverInfo })

test('initialize: echoes a supported protocol version and reports serverInfo', async () => {
  const result = await call({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } })

  assert.deepEqual(result, {
    jsonrpc: '2.0',
    id: 1,
    result: { protocolVersion: '2025-03-26', capabilities: { tools: {} }, serverInfo },
  })
})

test('initialize: falls back to the default version for unknown requested versions', async () => {
  const result = await call({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '1999-01-01' } })

  assert.equal((result?.result as { protocolVersion: string }).protocolVersion, MCP_DEFAULT_PROTOCOL_VERSION)
})

test('tools/list: returns the registry without handlers', async () => {
  const result = await call({ jsonrpc: '2.0', id: 3, method: 'tools/list' })
  const listed = (result?.result as { tools: Array<Record<string, unknown>> }).tools

  assert.equal(listed.length, 2)
  assert.deepEqual(Object.keys(listed[0]).sort(), ['description', 'inputSchema', 'name'])
})

test('tools/call: executes the tool with arguments', async () => {
  const result = await call({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'echo', arguments: { value: 'hi' } } })

  assert.deepEqual(result?.result, { content: [{ type: 'text', text: 'hi' }] })
})

test('tools/call: unknown tool → isError result, not a protocol error', async () => {
  const result = await call({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'nope' } })

  assert.equal((result?.result as { isError?: boolean }).isError, true)
})

test('tools/call: 403 from the API adds a scope hint', async () => {
  const result = await call({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'forbidden' } })
  const text = (result?.result as { content: Array<{ text: string }> }).content[0].text

  assert.match(text, /articles:publish/)
  assert.match(text, /API error 403/)
})

test('notifications and client responses produce no reply', async () => {
  assert.equal(await call({ jsonrpc: '2.0', method: 'notifications/initialized' }), null)
  assert.equal(await call({ jsonrpc: '2.0', id: 7, result: {} }), null)
})

test('unknown method → -32601', async () => {
  const result = await call({ jsonrpc: '2.0', id: 8, method: 'resources/list' })

  assert.equal(result?.error?.code, -32601)
})

test('non JSON-RPC payload → -32600', async () => {
  const result = await call({ id: 9, method: 'tools/list' })

  assert.equal(result?.error?.code, -32600)
})

test('executeToolCall: generic errors are wrapped into isError results', async () => {
  const throwing: McpToolDefinition = {
    name: 'boom',
    description: 'throws',
    scope: null,
    inputSchema: { type: 'object' },
    handler: async () => {
      throw new Error('kaput')
    },
  }

  const result = await executeToolCall([throwing], 'boom', {}, ctx)

  assert.equal(result.isError, true)
  assert.match(result.content[0].text, /kaput/)
})
