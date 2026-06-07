import { ACCOUNT_CONFIG } from '@config/env'
import connectDB from '@lib/db/client'
import RefreshToken, { IRefreshToken } from '@lib/db/models/RefreshToken'
import { UnauthorizedError } from '@lib/error/custom-errors'
import { buildDeviceLabel, maskIpForUser } from '@lib/utils/parse-user-agent'
import type { RequestClientMeta } from '@lib/utils/request-client-meta'
import mongoose from 'mongoose'

import type { JwtPayload } from '~/api/auth/model'

export type SessionPublicItem = {
  id: string
  deviceLabel: string
  loginAt: string | null
  lastSeenAt: string | null
  expiresAt: string | null
  isCurrent: boolean
}

export type SessionAdminItem = SessionPublicItem & {
  ip: string | null
  userAgent: string | null
}

const toIso = (value?: Date | null) => (value ? value.toISOString() : null)

export function assertSessionsEnabled(): void {
  if (!ACCOUNT_CONFIG.sessionsEnabled) {
    throw new Error('AUTH_SESSIONS_DISABLED')
  }
}

/**
 * Ensures the access JWT is still tied to an active refresh session (if `sid` is present).
 * Legacy tokens without `sid` remain valid until they expire.
 */
export async function assertActiveAccessSession(payload: JwtPayload): Promise<void> {
  if (!payload.sid) {
    return
  }

  if (!mongoose.isValidObjectId(payload.sid)) {
    throw new UnauthorizedError('Invalid session')
  }

  await connectDB()

  const exists = await RefreshToken.exists({
    _id: payload.sid,
    userId: payload.sub,
    expiresAt: { $gt: new Date() },
  })

  if (!exists) {
    throw new UnauthorizedError('Session revoked or expired')
  }
}

export async function findCurrentSessionId(refreshTokenString?: string | null): Promise<string | null> {
  if (!refreshTokenString) {
    return null
  }

  await connectDB()

  const doc = await RefreshToken.findOne({ token: refreshTokenString }).select('_id').lean()

  return doc?._id?.toString() ?? null
}

export async function listUserSessions(userId: string, currentSessionId?: string | null): Promise<SessionPublicItem[]> {
  await connectDB()

  const rows = await RefreshToken.find({ userId, expiresAt: { $gt: new Date() } })
    .sort({ lastSeenAt: -1, createdAt: -1 })
    .lean()

  return rows.map((row) => mapSessionPublic(row, currentSessionId))
}

export async function listUserSessionsAdmin(userId: string): Promise<SessionAdminItem[]> {
  await connectDB()

  const rows = await RefreshToken.find({ userId, expiresAt: { $gt: new Date() } })
    .sort({ lastSeenAt: -1, createdAt: -1 })
    .lean()

  return rows.map((row) => ({
    ...mapSessionPublic(row, null),
    ip: row.ip ?? null,
    userAgent: row.userAgent ?? null,
  }))
}

function mapSessionPublic(
  row: Pick<IRefreshToken, '_id' | 'deviceLabel' | 'createdAt' | 'lastSeenAt' | 'expiresAt'>,
  currentSessionId?: string | null,
): SessionPublicItem {
  const id = row._id.toString()

  return {
    id,
    deviceLabel: row.deviceLabel ?? 'Unknown device',
    loginAt: toIso(row.createdAt),
    lastSeenAt: toIso(row.lastSeenAt ?? row.createdAt),
    expiresAt: toIso(row.expiresAt),
    isCurrent: Boolean(currentSessionId && id === currentSessionId),
  }
}

export async function revokeUserSession(userId: string, sessionId: string): Promise<boolean> {
  if (!mongoose.isValidObjectId(sessionId)) {
    return false
  }

  await connectDB()

  const result = await RefreshToken.deleteOne({ _id: sessionId, userId })

  return result.deletedCount === 1
}

export async function revokeOtherUserSessions(userId: string, currentSessionId?: string | null): Promise<number> {
  await connectDB()

  if (!currentSessionId || !mongoose.isValidObjectId(currentSessionId)) {
    return 0
  }

  const result = await RefreshToken.deleteMany({
    userId,
    _id: { $ne: new mongoose.Types.ObjectId(currentSessionId) },
  })

  return result.deletedCount ?? 0
}

export function sessionMetaFromRequest(meta?: RequestClientMeta | null) {
  const userAgent = meta?.userAgent ?? null
  const ip = meta?.ip ?? null

  return {
    deviceLabel: buildDeviceLabel(userAgent),
    userAgent,
    ip,
    lastSeenAt: new Date(),
  }
}

export function inheritedSessionMeta(token: Pick<IRefreshToken, 'deviceLabel' | 'userAgent' | 'ip'>) {
  return {
    deviceLabel: token.deviceLabel ?? buildDeviceLabel(token.userAgent),
    userAgent: token.userAgent ?? null,
    ip: token.ip ?? null,
    lastSeenAt: new Date(),
  }
}

export { maskIpForUser }
