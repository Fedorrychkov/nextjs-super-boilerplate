import { getClientKey } from '@lib/security/rate-limit'
import type { NextRequest } from 'next/server'

export type RequestClientMeta = {
  ip: string | null
  userAgent: string | null
}

function firstForwardedIp(value: string | null): string | null {
  if (!value?.trim()) {
    return null
  }

  const first = value.split(',')[0]?.trim()

  return first || null
}

export function getRequestClientMeta(request: NextRequest): RequestClientMeta {
  const ip =
    getClientKey(request) ?? firstForwardedIp(request.headers.get('x-forwarded-for')) ?? firstForwardedIp(request.headers.get('cf-connecting-ip')) ?? null

  const userAgent = request.headers.get('user-agent')?.trim() || null

  return { ip, userAgent }
}
