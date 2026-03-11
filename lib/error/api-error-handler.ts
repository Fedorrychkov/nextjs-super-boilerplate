import { BruteForceError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from '@lib/error/custom-errors'
import { AxiosError, AxiosResponse } from 'axios'
import { NextRequest, NextResponse } from 'next/server'

import { getUniqueId } from '~/utils/getUniqueId'
import { logger } from '~/utils/logger'
import { time } from '~/utils/time'

/**
 * Method - wrapper, to reduce the code using catch and passing errors
 */
export const apiErrorHandlerContainer =
  (req: NextRequest) =>
  async <T>(handler: (res: typeof NextResponse, req: NextRequest) => Promise<T>) => {
    const res = NextResponse

    const traceId = getUniqueId()

    try {
      const start = time()

      logger.info('apiErrorHandlerContainer start', {
        traceId,
        url: req.nextUrl.toString(),
        method: req.method,
        headers: Object.fromEntries(req.headers.entries()),
        startHandler: start.toISOString(),
      })

      const result = await handler(res, req)

      logger.info('apiErrorHandlerContainer end', {
        traceId,
        url: req.nextUrl.toString(),
        method: req.method,
        endHandler: time().toISOString(),
        durationMs: time().diff(start, 'milliseconds'),
      })

      return result
    } catch (error: unknown) {
      if (error instanceof BruteForceError) {
        logger.warn(`apiErrorHandlerContainer BruteForceError traceId: ${traceId}`, {
          message: error.message,
          retryAfterSeconds: error.retryAfterSeconds,
        })

        const retryAfter = error.retryAfterSeconds && error.retryAfterSeconds > 0 ? Math.ceil(error.retryAfterSeconds) : undefined

        return res.json(
          {
            message: error.message,
            retryAfterSeconds: error.retryAfterSeconds,
          },
          {
            status: error.statusCode,
            headers: retryAfter ? { 'Retry-After': String(retryAfter) } : undefined,
          },
        )
      }

      if (error instanceof AxiosError) {
        logger.error(`apiErrorHandlerContainer AxiosError traceId: ${traceId}`, error.response?.data, error.response?.status)

        return res.json(
          {
            message: error.response?.data?.message,
            error: error.response?.data?.error,
          },
          {
            status: error.response?.status,
          },
        )
      }

      if (error instanceof ValidationError) {
        logger.error(`apiErrorHandlerContainer ValidationError traceId: ${traceId}`, {
          message: error.message,
        })

        return res.json({ message: error.message }, { status: error.statusCode })
      }

      if (error instanceof NotFoundError) {
        logger.error(`apiErrorHandlerContainer NotFoundError traceId: ${traceId}`, {
          message: error.message,
        })

        return res.json({ message: error.message }, { status: error.statusCode })
      }

      if (error instanceof UnauthorizedError) {
        logger.error(`apiErrorHandlerContainer UnauthorizedError traceId: ${traceId}`, {
          message: error.message,
        })

        return res.json({ message: error.message }, { status: error.statusCode })
      }

      if (error instanceof ForbiddenError) {
        logger.error(`apiErrorHandlerContainer ForbiddenError traceId: ${traceId}`, {
          message: error.message,
        })

        return res.json({ message: error.message }, { status: error.statusCode })
      }

      logger.error(`apiErrorHandlerContainer traceId: ${traceId}`, (error as Error)?.message)

      const response = error && typeof error === 'object' && 'response' in error ? (error.response as AxiosResponse) : null

      if (response) {
        return res.json(
          {
            message: response.data,
          },
          {
            status: response.status,
          },
        )
      }

      return res.json(
        {
          message: 'Something goes wrong...',
        },
        {
          status: 500,
        },
      )
    }
  }
