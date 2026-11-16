import { REDIS_URL } from '@config/env'
import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import User from '@lib/db/models/User'
import { redisClient } from '@lib/redis'
import mongoose from 'mongoose'

import { ArticleStatus } from '~/api/article/model'
import { UserStatus } from '~/api/user'
import { Logger } from '~/utils/logger'

import type { AdminOverview, ProbeState } from './admin-overview-rules'
import { platformSettingsService } from './platform-settings.service'
import { workerStatus } from './worker-health.service'

const logger = new Logger(['admin-overview', '[lib/services/admin-overview.service.ts]'])

const PROBE_TIMEOUT_MS = 2000
const DAY_MS = 24 * 60 * 60 * 1000
/** The worker looks for due articles every minute; past this a publication is late, not pending. */
const OVERDUE_GRACE_MS = 5 * 60 * 1000

const withTimeout = <T>(promise: Promise<T>): Promise<T> =>
  Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), PROBE_TIMEOUT_MS))])

/**
 * One read for the admin landing page. Unlike the rest of the code, a failing dependency here is
 * reported instead of thrown: the page exists to show what is down, so it must render when it is.
 */
export async function adminOverview(now: Date = new Date()): Promise<AdminOverview> {
  let db: ProbeState = 'fail'

  try {
    await withTimeout(connectDB())
    await withTimeout(mongoose.connection.db!.admin().command({ ping: 1 }))
    db = 'ok'
  } catch (error) {
    logger.warn('database ping failed', { message: error instanceof Error ? error.message : String(error) })
  }

  let redis: ProbeState = 'off'

  if (REDIS_URL && redisClient.client) {
    try {
      await withTimeout(redisClient.client.ping())
      redis = 'ok'
    } catch (error) {
      redis = 'fail'
      logger.warn('redis ping failed', { message: error instanceof Error ? error.message : String(error) })
    }
  }

  if (db === 'fail') {
    return { db, redis, worker: 'unknown', metricsSink: 'unknown', users: null, articles: null, generatedAt: now.toISOString() }
  }

  const weekAgo = new Date(now.getTime() - 7 * DAY_MS).toISOString()
  const notPublished = { $ne: ArticleStatus.PUBLISHED }

  const [worker, metricsSink, total, last7Days, blocked, published, drafts, scheduled, overdue] = await Promise.all([
    workerStatus(now),
    platformSettingsService.get('metrics.sink'),
    User.countDocuments({}),
    // `createdAt` is stored as an ISO string; ISO strings compare in time order.
    User.countDocuments({ createdAt: { $gte: weekAgo } }),
    User.countDocuments({ status: UserStatus.BLOCKED }),
    Article.countDocuments({ status: ArticleStatus.PUBLISHED }),
    Article.countDocuments({ status: ArticleStatus.DRAFT }),
    Article.countDocuments({ status: notPublished, scheduledAt: { $ne: null } }),
    Article.countDocuments({ status: notPublished, scheduledAt: { $ne: null, $lte: new Date(now.getTime() - OVERDUE_GRACE_MS) } }),
  ])

  return {
    db,
    redis,
    worker,
    metricsSink,
    users: { total, last7Days, blocked },
    articles: { published, drafts, scheduled, overdue },
    generatedAt: now.toISOString(),
  }
}
