import { NotificationChannel } from '~/api/notification'

import { EMAIL_CONFIG, NOTIFICATION_CONFIG } from './env'

export type NotificationEventId = 'article' | 'mfa' | 'login' | 'password'

export type NotificationEventConfig = {
  enabled: boolean
  channels: NotificationChannel[]
}

/** Mirrors `isTransactionalEmailEnabled` without importing email service (avoids env/logger cycle). */
function isNotificationEmailAvailable(): boolean {
  if (EMAIL_CONFIG.sendMode === 'elastic') {
    return Boolean(EMAIL_CONFIG.emailApiKey.trim())
  }

  return EMAIL_CONFIG.sendMode !== 'console'
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

function filterAvailableChannels(channels: NotificationChannel[]): NotificationChannel[] {
  return channels.filter((channel) => {
    if (channel === NotificationChannel.EMAIL) {
      return isNotificationEmailAvailable()
    }

    return true
  })
}

function parseChannelsCsv(value: string | undefined, fallback: NotificationChannel[]): NotificationChannel[] {
  if (!value?.trim()) {
    return filterAvailableChannels(fallback)
  }

  const tokens = value
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)

  if (tokens.includes('all')) {
    return filterAvailableChannels([NotificationChannel.WEB_PUSH, NotificationChannel.EMAIL])
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
    return filterAvailableChannels(fallback)
  }

  return filterAvailableChannels([...mapped])
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

/** Returns channels when event is enabled; otherwise `null` (skip notification). */
export function resolveNotificationChannelsForEvent(eventId: NotificationEventId): NotificationChannel[] | null {
  const config = getNotificationEventConfig(eventId)

  if (!config.enabled || config.channels.length === 0) {
    return null
  }

  return config.channels
}
