import type { McpToolDefinition } from '../registry'
import { articleTools } from './articles.mcp'
import { mediaTools } from './media.mcp'

/**
 * Aggregated tool registry.
 * Downstream projects: add your own `<domain>.mcp.ts` and spread it here — one line per domain.
 */
export const allTools: McpToolDefinition[] = [...articleTools, ...mediaTools]
