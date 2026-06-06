import { NEXT_PUBLIC_SITE_URL } from '@config/env'
import { ValidationError } from '@lib/error/custom-errors'

import type { TFunction } from '~/lib/i18n'

export function normalizeNotificationUrlPath(urlPath: string, t: TFunction): string {
  const trimmed = String(urlPath ?? '').trim()

  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    throw new ValidationError(t('platformNotifications.errors.invalidUrlPath'))
  }

  if (/^\/javascript:/i.test(trimmed)) {
    throw new ValidationError(t('platformNotifications.errors.invalidUrlPath'))
  }

  return trimmed
}

export function buildAbsoluteNotificationUrl(urlPath: string, t: TFunction): string {
  const base = NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')

  return `${base}${normalizeNotificationUrlPath(urlPath, t)}`
}
