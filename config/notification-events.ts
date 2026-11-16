import { NotificationChannel } from '~/api/notification'

import { EMAIL_CONFIG, NOTIFICATION_CONFIG } from './env'

export type NotificationEventId = 'article' | 'mfa' | 'login' | 'password'

export type NotificationEventConfig = {
  enabled: boolean
  channels: NotificationChannel[]
}

/**
 * Mirrors `isEmailDeliverable` (lib/services/email/email-mode.ts) without importing the email
 * service — that would create an env/logger cycle. Keep the two in step: elastic with a key is
 * the only mode that delivers; console, empty and a typo do not.
 */
export function isNotificationEmailAvailable(): boolean {
  return EMAIL_CONFIG.sendMode?.trim().toLowerCase() === 'elastic' && Boolean(EMAIL_CONFIG.emailApiKey.trim())
}

function parseBoolFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value.trim() === '') {
    return defaultValue
  }

  const normalized = value.trim().toLowerCase()

  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return false
  }

  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

/**
 * Channels are NOT filtered by availability here. The EMAIL channel used to be dropped when mail
 * was not configured, and an event whose only channel is email (`login`, `password` by default)
 * then had no channels and was never recorded at all — a security event lost without a trace.
 * Delivery marks the channel SKIPPED with a reason instead (`platform-notification.service.ts`),
 * so the notification exists and the screen says why no mail went out.
 */
function parseChannelsCsv(value: string | undefined, fallback: NotificationChannel[]): NotificationChannel[] {
  if (!value?.trim()) {
    return fallback
  }

  const tokens = value
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)

  if (tokens.includes('all')) {
    return [NotificationChannel.WEB_PUSH, NotificationChannel.EMAIL]
  }

  const mapped = new Set<NotificationChannel>()

  for (const token of tokens) {
    if (token === 'web_push' || token === 'webpush' || token === 'push') {
      mapped.add(NotificationChannel.WEB_PUSH)
    } else if (token === 'email' || token === 'mail') {
      mapped.add(NotificationChannel.EMAIL)
    }
  }

  if (mapped.size === 0) {
    return fallback
  }

  return [...mapped]
}

const NOTIFICATION_EVENTS_CONFIG: Record<NotificationEventId, NotificationEventConfig> = {
  article: {
    enabled: parseBoolFlag(NOTIFICATION_CONFIG.articleEnabled, true),
    channels: parseChannelsCsv(NOTIFICATION_CONFIG.articleChannels, [NotificationChannel.WEB_PUSH, NotificationChannel.EMAIL]),
  },
  mfa: {
    enabled: parseBoolFlag(NOTIFICATION_CONFIG.mfaEnabled, true),
    channels: parseChannelsCsv(NOTIFICATION_CONFIG.mfaChannels, [NotificationChannel.EMAIL, NotificationChannel.WEB_PUSH]),
  },
  login: {
    enabled: parseBoolFlag(NOTIFICATION_CONFIG.loginEnabled, true),
    channels: parseChannelsCsv(NOTIFICATION_CONFIG.loginChannels, [NotificationChannel.EMAIL]),
  },
  password: {
    enabled: parseBoolFlag(NOTIFICATION_CONFIG.passwordEnabled, true),
    channels: parseChannelsCsv(NOTIFICATION_CONFIG.passwordChannels, [NotificationChannel.EMAIL]),
  },
}

export function getNotificationEventConfig(eventId: NotificationEventId): NotificationEventConfig {
  return NOTIFICATION_EVENTS_CONFIG[eventId]
}

/** Channels of an enabled event; `null` only when the event is switched off by its flag. */
export function resolveNotificationChannelsForEvent(eventId: NotificationEventId): NotificationChannel[] | null {
  const config = getNotificationEventConfig(eventId)

  if (!config.enabled) {
    return null
  }

  return config.channels
}
