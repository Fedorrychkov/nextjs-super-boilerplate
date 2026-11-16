import { HEALTHCHECK_DB_STRICT, isDevelop } from '@config/env'
import connectDB from '@lib/db/client'
import { apiErrorHandlerContainer, withGlobalRateLimit } from '@lib/middleware'
import type { WorkerState } from '@lib/services/worker-health'
import { workerStatus } from '@lib/services/worker-health.service'
import mongoose from 'mongoose'
import { NextRequest, NextResponse } from 'next/server'

import { Logger } from '~/utils/logger'

const logger = new Logger(['healthcheck', '[src/app/api/v1/healthcheck/route.ts]'])

// The answer describes the process right now: never cache it.
export const dynamic = 'force-dynamic'
export const revalidate = 0

// The container probe runs every 10 seconds; the check must finish well inside that.
const PING_TIMEOUT_MS = 2000

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))])

/**
 * This route is the docker healthcheck of the api container, the signal blue/green waits for and
 * what nginx keeps the upstream on. It used to answer 200 without touching the database, so a
 * process with a dead Mongo looked alive. Now the body always reports `db`; the STATUS stays 200
 * unless HEALTHCHECK_DB_STRICT=true, because a 503 makes the container unhealthy and, on a slow
 * or briefly unavailable database, would turn a hiccup into nginx dropping the upstream. Strict
 * mode is the owner's call per deployment.
 */
const handler = (request: NextRequest) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    let db: 'ok' | 'fail' = 'fail'

    try {
      await withTimeout(connectDB(), PING_TIMEOUT_MS)
      await withTimeout(mongoose.connection.db!.admin().command({ ping: 1 }), PING_TIMEOUT_MS)
      db = 'ok'
    } catch (error) {
      // The route is public: no reason in the body. The reason goes to the application log.
      logger.warn('healthcheck: database ping failed', { message: error instanceof Error ? error.message : String(error) })
      db = 'fail'
    }

    // The worker is its own process; its health never changes the API status — otherwise a dead
    // worker would make nginx drop a live API. Only reported: `stale` — no mark for over three
    // intervals, `never` — the worker has never run (normal when it is switched off).
    let worker: WorkerState | 'unknown' = 'unknown'

    if (db === 'ok') {
      try {
        worker = await withTimeout(workerStatus(), PING_TIMEOUT_MS)
      } catch {
        worker = 'unknown'
      }
    }

    return response.json({ isDevelop, db, worker }, { status: db === 'fail' && HEALTHCHECK_DB_STRICT ? 503 : 200 })
  })

export const GET = withGlobalRateLimit(handler)
