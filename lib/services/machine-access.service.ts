import connectDB from '@lib/db/client'
import ApiToken from '@lib/db/models/ApiToken'
import ApiTokenUsageEvent from '@lib/db/models/ApiTokenUsageEvent'
import McpOAuthGrant from '@lib/db/models/McpOAuthGrant'
import User from '@lib/db/models/User'
import mongoose from 'mongoose'

import {
  MACHINE_ACCESS_USAGE_WINDOWS,
  type MachineAccessGrantRow,
  type MachineAccessTokenRow,
  type MachineAccessUsageCounts,
  type MachineAccessUsageEventRow,
  type MachineAccessUsageWindow,
  type MachineAccessUserDetail,
  type MachineAccessUserRow,
} from '~/api/machine-access'
import type { PaginationMeta } from '~/types/pagination'

import { buildPaginationMeta } from '../db/utils/buildPaginationMeta'
import { mapApiTokenItem } from './api-token.service'
import { recordSecurityAuditEvent } from './security-audit.service'

/**
 * Admin oversight of machine access. Usage is a full per-request time series
 * (`ApiTokenUsageEvent`, TTL-bounded) aggregated into rolling windows in ONE pipeline pass
 * per query — conditional sums instead of N countDocuments.
 */

const WINDOW_MS: Record<MachineAccessUsageWindow, number> = {
  h1: 60 * 60 * 1000,
  h6: 6 * 60 * 60 * 1000,
  h12: 12 * 60 * 60 * 1000,
  d1: 24 * 60 * 60 * 1000,
  d7: 7 * 24 * 60 * 60 * 1000,
}

function emptyUsage(): MachineAccessUsageCounts {
  return Object.fromEntries(MACHINE_ACCESS_USAGE_WINDOWS.map((window) => [window, { total: 0, mcp: 0 }])) as MachineAccessUsageCounts
}

/** `$sum: {$cond: [createdAt >= since, 1, 0]}` per window (+ per window for mcp transport). */
function windowSumStages(now: number): Record<string, unknown> {
  const group: Record<string, unknown> = {}

  for (const window of MACHINE_ACCESS_USAGE_WINDOWS) {
    const since = new Date(now - WINDOW_MS[window])

    group[`${window}_total`] = { $sum: { $cond: [{ $gte: ['$createdAt', since] }, 1, 0] } }
    group[`${window}_mcp`] = { $sum: { $cond: [{ $and: [{ $gte: ['$createdAt', since] }, { $eq: ['$transport', 'mcp'] }] }, 1, 0] } }
  }

  return group
}

function mapUsageRow(row: Record<string, number> | undefined): MachineAccessUsageCounts {
  const usage = emptyUsage()

  if (!row) {
    return usage
  }

  for (const window of MACHINE_ACCESS_USAGE_WINDOWS) {
    usage[window] = { total: row[`${window}_total`] ?? 0, mcp: row[`${window}_mcp`] ?? 0 }
  }

  return usage
}

/** Usage windows grouped by an arbitrary key (`$ownerUserId` / `$tokenId`) for a set of ids. */
async function aggregateUsageBy(field: 'ownerUserId' | 'tokenId', ids: mongoose.Types.ObjectId[]): Promise<Map<string, MachineAccessUsageCounts>> {
  if (!ids.length) {
    return new Map()
  }

  const now = Date.now()

  const rows = await ApiTokenUsageEvent.aggregate<Record<string, number> & { _id: mongoose.Types.ObjectId }>([
    { $match: { [field]: { $in: ids }, createdAt: { $gte: new Date(now - WINDOW_MS.d7) } } },
    { $group: { _id: `$${field}`, ...windowSumStages(now) } },
  ])

  return new Map(rows.map((row) => [row._id.toString(), mapUsageRow(row)]))
}

// #region Recording

/**
 * Fire-and-forget: never throws, never awaited on the request path.
 * REST calls come from `withApiTokenOrAuth`; MCP tool calls from `/api/mcp`.
 */
export function recordApiTokenUsage(params: {
  tokenId: string
  ownerUserId: string
  kind: string
  transport: 'rest' | 'mcp'
  method: string
  path: string
  tool?: string | null
}): void {
  void connectDB()
    .then(() =>
      ApiTokenUsageEvent.create({
        tokenId: new mongoose.Types.ObjectId(params.tokenId),
        ownerUserId: new mongoose.Types.ObjectId(params.ownerUserId),
        kind: params.kind || 'pat',
        transport: params.transport,
        method: params.method,
        path: params.path,
        tool: params.tool ?? null,
      }),
    )
    .catch(() => undefined)
}

// #endregion

// #region Admin overview

/** Users that have (or had) machine access: any tokens or grants. Paginated, newest activity first. */
export async function listMachineAccessUsers(params: { limit?: number; offset?: number }): Promise<PaginationMeta<MachineAccessUserRow>> {
  await connectDB()

  const limit = Math.min(Math.max(1, Math.floor(params.limit ?? 25)), 100)
  const offset = Math.max(0, Math.floor(params.offset ?? 0))
  const now = new Date()

  // Owners of at least one token, with per-kind active counts and last activity — single pipeline.
  const grouped = await ApiToken.aggregate<{
    _id: mongoose.Types.ObjectId
    tokensTotal: number
    activePat: number
    activeOauth: number
    lastUsedAt: Date | null
  }>([
    {
      $group: {
        _id: '$ownerUserId',
        tokensTotal: { $sum: 1 },
        activePat: {
          $sum: {
            $cond: [{ $and: [{ $ne: [{ $ifNull: ['$kind', 'pat'] }, 'oauth'] }, { $eq: ['$revokedAt', null] }, { $gt: ['$expiresAt', now] }] }, 1, 0],
          },
        },
        activeOauth: {
          $sum: {
            $cond: [{ $and: [{ $eq: ['$kind', 'oauth'] }, { $eq: ['$revokedAt', null] }, { $gt: ['$expiresAt', now] }] }, 1, 0],
          },
        },
        lastUsedAt: { $max: '$lastUsedAt' },
      },
    },
    { $sort: { lastUsedAt: -1, _id: -1 } },
  ])

  const page = grouped.slice(offset, offset + limit)
  const userIds = page.map((row) => row._id)

  const [users, usageByUser] = await Promise.all([User.find({ _id: { $in: userIds } }), aggregateUsageBy('ownerUserId', userIds)])
  const usersById = new Map(users.map((user) => [user._id.toString(), user]))

  const list: MachineAccessUserRow[] = page.map((row) => {
    const id = row._id.toString()
    const user = usersById.get(id)

    return {
      userId: id,
      email: user?.email ?? 'deleted user',
      role: user?.role ?? '-',
      machineAccessBlockedAt: user?.machineAccessBlockedAt ? new Date(user.machineAccessBlockedAt).toISOString() : null,
      activePatCount: row.activePat,
      activeOauthCount: row.activeOauth,
      tokensTotal: row.tokensTotal,
      lastUsedAt: row.lastUsedAt ? new Date(row.lastUsedAt).toISOString() : null,
      usage: usageByUser.get(id) ?? emptyUsage(),
    }
  })

  return buildPaginationMeta({ list, count: grouped.length, limit, offset })
}

export async function getMachineAccessUserDetail(userId: string): Promise<MachineAccessUserDetail | null> {
  await connectDB()

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return null
  }

  const user = await User.findById(userId)

  if (!user) {
    return null
  }

  const ownerId = user._id as mongoose.Types.ObjectId
  const now = new Date()

  const [tokens, grants, usageByUser, recent] = await Promise.all([
    ApiToken.find({ ownerUserId: ownerId }).sort({ createdAt: -1 }).limit(100),
    McpOAuthGrant.find({ userId: ownerId }).sort({ createdAt: -1 }).limit(100),
    aggregateUsageBy('ownerUserId', [ownerId]),
    ApiTokenUsageEvent.find({ ownerUserId: ownerId }).sort({ createdAt: -1 }).limit(50),
  ])

  const usageByToken = await aggregateUsageBy(
    'tokenId',
    tokens.map((token) => token._id as mongoose.Types.ObjectId),
  )

  const tokenRows: MachineAccessTokenRow[] = tokens.map((token) => ({
    ...mapApiTokenItem(token),
    usage: usageByToken.get(token._id.toString()) ?? emptyUsage(),
  }))

  const grantRows: MachineAccessGrantRow[] = grants.map((grant) => ({
    id: grant._id.toString(),
    clientName: grant.clientName,
    scopes: grant.scopes,
    apiTokenId: grant.apiTokenId.toString(),
    expiresAt: new Date(grant.expiresAt).toISOString(),
    revokedAt: grant.revokedAt ? new Date(grant.revokedAt).toISOString() : null,
    lastRefreshedAt: grant.lastRefreshedAt ? new Date(grant.lastRefreshedAt).toISOString() : null,
    createdAt: grant.createdAt ? new Date(grant.createdAt).toISOString() : null,
  }))

  const recentEvents: MachineAccessUsageEventRow[] = recent.map((event) => ({
    at: new Date(event.createdAt).toISOString(),
    transport: event.transport,
    method: event.method,
    path: event.path,
    tool: event.tool ?? null,
    tokenId: event.tokenId.toString(),
  }))

  const activePat = tokens.filter((token) => (token.kind || 'pat') === 'pat' && !token.revokedAt && token.expiresAt > now).length
  const activeOauth = tokens.filter((token) => token.kind === 'oauth' && !token.revokedAt && token.expiresAt > now).length
  const lastUsedAt = tokens.reduce<Date | null>((acc, token) => (token.lastUsedAt && (!acc || token.lastUsedAt > acc) ? token.lastUsedAt : acc), null)

  return {
    user: {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      machineAccessBlockedAt: user.machineAccessBlockedAt ? new Date(user.machineAccessBlockedAt).toISOString() : null,
      activePatCount: activePat,
      activeOauthCount: activeOauth,
      tokensTotal: tokens.length,
      lastUsedAt: lastUsedAt ? lastUsedAt.toISOString() : null,
      usage: usageByUser.get(user._id.toString()) ?? emptyUsage(),
    },
    tokens: tokenRows,
    grants: grantRows,
    recentEvents,
  }
}

// #endregion

// #region Blocking

/**
 * Per-user kill-switch for ALL machine access (PAT + OAuth). Applied on every request via
 * `verifyApiToken`, so it takes effect immediately without revoking anything — unblocking
 * restores the user's existing tokens/connections as they were.
 */
export async function setMachineAccessBlocked(params: { userId: string; blocked: boolean; actorUserId: string }): Promise<boolean> {
  await connectDB()

  if (!mongoose.Types.ObjectId.isValid(params.userId)) {
    return false
  }

  const user = await User.findById(params.userId)

  if (!user) {
    return false
  }

  user.machineAccessBlockedAt = params.blocked ? new Date() : null
  user.machineAccessBlockedBy = params.blocked ? new mongoose.Types.ObjectId(params.actorUserId) : null
  await user.save()

  await recordSecurityAuditEvent({
    action: params.blocked ? 'machine_access_blocked' : 'machine_access_unblocked',
    actorUserId: params.actorUserId,
    targetUserId: params.userId,
    metadata: { email: user.email },
  })

  return true
}

// #endregion
