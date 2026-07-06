import type { ApiTokenModel } from '../api-token'

/**
 * Admin oversight of machine access (PATs + OAuth/MCP connections):
 * per-user overview, full usage time series aggregated into windows, block/unblock.
 */

export const MACHINE_ACCESS_USAGE_WINDOWS = ['h1', 'h6', 'h12', 'd1', 'd7'] as const

export type MachineAccessUsageWindow = (typeof MACHINE_ACCESS_USAGE_WINDOWS)[number]

/** Request counts per rolling window; `mcp` — MCP tool calls, the rest are direct REST requests. */
export type MachineAccessUsageCounts = Record<MachineAccessUsageWindow, { total: number; mcp: number }>

export type MachineAccessUserRow = {
  userId: string
  email: string
  role: string
  /** Set → ALL machine access of the user is blocked (kill-switch). */
  machineAccessBlockedAt: string | null
  /** Active (not revoked, not expired) tokens by kind. */
  activePatCount: number
  activeOauthCount: number
  tokensTotal: number
  lastUsedAt: string | null
  usage: MachineAccessUsageCounts
}

export type MachineAccessTokenRow = ApiTokenModel & {
  usage: MachineAccessUsageCounts
}

export type MachineAccessGrantRow = {
  id: string
  clientName: string
  scopes: string[]
  apiTokenId: string
  expiresAt: string
  revokedAt: string | null
  lastRefreshedAt: string | null
  createdAt: string | null
}

export type MachineAccessUsageEventRow = {
  at: string
  transport: 'rest' | 'mcp'
  method: string
  path: string
  tool: string | null
  tokenId: string
}

export type MachineAccessUserDetail = {
  user: MachineAccessUserRow
  tokens: MachineAccessTokenRow[]
  grants: MachineAccessGrantRow[]
  recentEvents: MachineAccessUsageEventRow[]
}

export type MachineAccessBlockPayload = {
  userId: string
  blocked: boolean
}
