import { AxiosError, AxiosResponse } from 'axios'
import { NextRequest, NextResponse } from 'next/server'

import { logger } from '~/utils/logger'

/**
 * Method - wrapper, to reduce the code using catch and passing errors
 */
export const apiErrorHandlerContainer =
  (req: NextRequest) =>
  async <T>(handler: (res: typeof NextResponse, req: NextRequest) => Promise<T>) => {
    const res = NextResponse

    try {
      logger.info('apiErrorHandlerContainer start', {
        url: req.nextUrl.toString(),
        method: req.method,
        headers: Object.fromEntries(req.headers.entries()),
      })

      return await handler(res, req)
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        logger.error('apiErrorHandlerContainer AxiosError', error.response?.data, error.response?.status)

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

      logger.error('apiErrorHandlerContainer', error)

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
