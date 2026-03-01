import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { time } from '~/utils/time'

export async function proxy(request: NextRequest) {
  const clientIP = request.headers.get('x-client-ip')
  const processedBy = request.headers.get('x-processed-by')
  const requestId = request.headers.get('x-request-id')
  const requestTime = request.headers.get('x-request-time')
  const responseTime = request.headers.get('x-response-time')
  const userAgent = request.headers.get('x-user-agent')
  const customClientInfo = request.headers.get('x-custom-client-info')
  const source = request.headers.get('x-request-source')

  // Build client info object
  const clientInfo = {
    ip: clientIP,
    requestId,
    responseTime,
    requestTime,
    userAgent,
    processedBy,
    customInfo: customClientInfo,
    source: source ? source : 'web-client',
    timestamp: time().toISOString(),
  }

  const response = NextResponse.next()

  // Set Authorization header from httpOnly cookies
  // Next.js middleware can read httpOnly cookies, unlike client-side JavaScript
  if (request.cookies.has('accessToken')) {
    const accessToken = request.cookies.get('accessToken')?.value

    if (accessToken) {
      response.headers.set('Authorization', `Bearer ${accessToken}`)
    }
  }

  response.headers.set('X-Client-Info', JSON.stringify(clientInfo))

  if (clientIP) {
    response.headers.set('X-Client-IP', clientIP)
    response.headers.set('X-Real-IP', clientIP)
    response.headers.set('X-Forwarded-For', clientIP)
  }

  if (processedBy) response.headers.set('X-Processed-By', processedBy)

  if (clientInfo.source) response.headers.set('X-Request-Source', clientInfo.source)

  if (requestId) response.headers.set('X-Request-ID', requestId)

  if (responseTime) response.headers.set('X-Response-Time', responseTime)

  if (requestTime) response.headers.set('X-Request-Time', requestTime)

  if (userAgent) response.headers.set('X-User-Agent', userAgent)

  return response
}
