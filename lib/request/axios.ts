import axios, { AxiosInstance, CreateAxiosDefaults } from 'axios'

import { logger } from '~/utils/logger'

export class Request {
  private readonly client: AxiosInstance
  private readonly isServerRequest: boolean

  // Shared flag and promise for single-flight token refresh
  private static isRefreshing = false
  private static refreshPromise: Promise<unknown> | null = null

  constructor(config?: CreateAxiosDefaults) {
    const { headers, baseURL, ...props } = config || {}

    // Detect server vs client request: server has baseURL (to backend), client does not (to /api)
    this.isServerRequest = !!baseURL

    this.client = axios.create({
      baseURL,
      headers: {
        Accept: '*/*',
        ...(headers as any),
      },
      withCredentials: true,
      ...props,
    })

    this.client.interceptors.request.use(
      (config) => {
        logger.info('axios interceptor request', config.url, config.method, config.headers)

        return config
      },
      (error) => {
        logger.error('axios interceptor request error', error)

        return Promise.reject(error)
      },
    )

    this.client.interceptors.response.use(
      (response) => {
        return response
      },
      async (error) => {
        logger.error('axios interceptor error', { data: error.response?.data, status: error.response?.status })
        const originalRequest = error.config

        let nextPath = ''

        if (!this.isServerRequest && typeof window !== 'undefined') {
          nextPath = window.location.pathname
        }

        if (error?.response?.status === 400 && error?.response?.data?.message === 'No refresh token') {
          if (!this.isServerRequest && typeof window !== 'undefined') {
            window.location.href = `/logout?nextPath=${nextPath ?? '/'}`
          } else {
            return Promise.reject(error)
          }

          return Promise.reject(error)
        }

        /**
         * On 401, handle logout differently for client vs server
         */
        if (error?.status === 401 || error?.response?.status === 401) {
          if (this.isServerRequest || typeof window === 'undefined' || error.config.url?.includes('v1/auth')) {
            // Return 401 so API route can handle it
            return Promise.reject({
              ...error,
              status: 401,
              message: 'Authentication required',
              cookiesCleared: true,
            })
          } else {
            // For client: try once to refresh token and retry
            if (!originalRequest || originalRequest._retry) {
              // Already tried refresh for this request — exit to avoid loop
              return Promise.reject(error)
            }

            originalRequest._retry = true

            try {
              logger.info('Try to refresh token...')

              if (!Request.isRefreshing) {
                logger.info('Start refreshing token...')
                Request.isRefreshing = true
                Request.refreshPromise = this.client
                  .post('/api/v1/auth/refresh')
                  .catch((refreshError) => {
                    console.error('Failed to refresh token:', refreshError)
                    throw refreshError
                  })
                  .finally(() => {
                    Request.isRefreshing = false
                    Request.refreshPromise = null
                  })
              }

              // Wait for shared refresh (single-flight for all 401)
              if (Request.refreshPromise) {
                logger.debug('Wait for shared refresh (single-flight for all 401)')
                await Request.refreshPromise
              }

              // After successful refresh, retry original request
              return this.client(originalRequest)
            } catch (refreshError) {
              // If refresh failed, reject with original error for upper layer to handle
              return Promise.reject(refreshError)
            }
          }
        }

        return Promise.reject(error)
      },
    )

    return this
  }

  get apiClient() {
    return this.client
  }
}
