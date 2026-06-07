import { deliverEventNotification } from '@lib/services/notification-events.service'

import { PlatformNotificationType } from '~/api/notification'
import type { TFunction } from '~/lib/i18n'

import type { RequestClientMeta } from '../utils/request-client-meta'

const PROFILE_URL_PATH = '/profile'

export async function notifyMfaEnabled(params: { recipientUserId: string; t: TFunction }): Promise<void> {
  await deliverEventNotification({
    eventId: 'mfa',
    recipientUserId: params.recipientUserId,
    type: PlatformNotificationType.MFA_ENABLED,
    title: params.t('platformNotifications.triggers.mfaEnabled.title'),
    body: params.t('platformNotifications.triggers.mfaEnabled.body'),
    urlPath: PROFILE_URL_PATH,
    source: 'mfa_enable',
    t: params.t,
  })
}

export async function notifyMfaDisabled(params: { recipientUserId: string; t: TFunction }): Promise<void> {
  await deliverEventNotification({
    eventId: 'mfa',
    recipientUserId: params.recipientUserId,
    type: PlatformNotificationType.MFA_DISABLED,
    title: params.t('platformNotifications.triggers.mfaDisabled.title'),
    body: params.t('platformNotifications.triggers.mfaDisabled.body'),
    urlPath: PROFILE_URL_PATH,
    source: 'mfa_disable',
    t: params.t,
  })
}

export async function notifyNewLogin(params: { recipientUserId: string; t: TFunction; client: RequestClientMeta; usedMfaBackupCode?: boolean }): Promise<void> {
  const ip = params.client.ip ?? params.t('platformNotifications.triggers.newLogin.unknownIp')
  const userAgent = params.client.userAgent ?? params.t('platformNotifications.triggers.newLogin.unknownDevice')

  await deliverEventNotification({
    eventId: 'login',
    recipientUserId: params.recipientUserId,
    type: PlatformNotificationType.NEW_LOGIN,
    title: params.t('platformNotifications.triggers.newLogin.title'),
    body: params.t('platformNotifications.triggers.newLogin.body', {
      ip,
      userAgent,
      backup: params.usedMfaBackupCode ? params.t('platformNotifications.triggers.newLogin.usedBackupCode') : '',
    }),
    urlPath: PROFILE_URL_PATH,
    source: 'auth_login',
    t: params.t,
  })
}

export async function notifyPasswordChanged(params: { recipientUserId: string; t: TFunction }): Promise<void> {
  await deliverEventNotification({
    eventId: 'password',
    recipientUserId: params.recipientUserId,
    type: PlatformNotificationType.PASSWORD_CHANGED,
    title: params.t('platformNotifications.triggers.passwordChanged.title'),
    body: params.t('platformNotifications.triggers.passwordChanged.body'),
    urlPath: PROFILE_URL_PATH,
    source: 'password_change',
    t: params.t,
  })
}

export async function notifyPasswordReset(params: { recipientUserId: string; t: TFunction }): Promise<void> {
  await deliverEventNotification({
    eventId: 'password',
    recipientUserId: params.recipientUserId,
    type: PlatformNotificationType.PASSWORD_RESET,
    title: params.t('platformNotifications.triggers.passwordReset.title'),
    body: params.t('platformNotifications.triggers.passwordReset.body'),
    urlPath: PROFILE_URL_PATH,
    source: 'password_forgot',
    t: params.t,
  })
}

export async function notifyAdminPasswordSet(params: { recipientUserId: string; t: TFunction }): Promise<void> {
  await deliverEventNotification({
    eventId: 'password',
    recipientUserId: params.recipientUserId,
    type: PlatformNotificationType.ADMIN_PASSWORD_SET,
    title: params.t('platformNotifications.triggers.adminPasswordSet.title'),
    body: params.t('platformNotifications.triggers.adminPasswordSet.body'),
    urlPath: PROFILE_URL_PATH,
    source: 'admin_password_set',
    t: params.t,
  })
}
