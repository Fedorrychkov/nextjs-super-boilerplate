import connectDB from '@lib/db/client'
import PlatformNotification from '@lib/db/models/PlatformNotification'
import User from '@lib/db/models/User'
import { ValidationError } from '@lib/error/custom-errors'
import { buildAbsoluteNotificationUrl, normalizeNotificationUrlPath } from '@lib/utils/notification-url'
import mongoose from 'mongoose'

import { NotificationChannel, type NotificationChannelDeliveryModel, NotificationDeliveryStatus, type PlatformNotificationModel } from '~/api/notification'
import type { CreatePlatformNotificationDto, PlatformNotificationFilter } from '~/api/notification/types'
import type { TFunction } from '~/lib/i18n'
import type { PaginationMeta } from '~/types/pagination'
import { time } from '~/utils/time'

import { emailService } from './email/email.service'
import { summarizeWebPushErrors, webPushService } from './web-push.service'

function docToModel(doc: {
  _id: { toString(): string }
  recipientUserId?: { toString(): string } | null
  type: string
  title: string
  body: string
  urlPath: string
  source?: string | null
  channelsRequested?: NotificationChannel[]
  channelDeliveries?: NotificationChannelDeliveryModel[]
  deliveryStatus: NotificationDeliveryStatus
  createdAt?: string | null
}): PlatformNotificationModel {
  return {
    id: doc._id.toString(),
    recipientUserId: doc.recipientUserId?.toString() ?? null,
    type: doc.type,
    title: doc.title,
    body: doc.body,
    urlPath: doc.urlPath,
    source: doc.source ?? null,
    channelsRequested: [...(doc.channelsRequested ?? [])],
    channelDeliveries: [...(doc.channelDeliveries ?? [])],
    deliveryStatus: doc.deliveryStatus,
    createdAt: doc.createdAt ?? null,
  }
}

function computeAggregateDeliveryStatus(recipientUserId: string | null, deliveries: NotificationChannelDeliveryModel[]): NotificationDeliveryStatus {
  if (!recipientUserId) {
    return NotificationDeliveryStatus.RECORD_ONLY
  }

  const attempted = deliveries.filter((d) => d.attempted)

  if (attempted.length === 0) {
    return NotificationDeliveryStatus.DELIVERED
  }

  if (attempted.some((d) => d.status === NotificationDeliveryStatus.DELIVERED)) {
    return NotificationDeliveryStatus.DELIVERED
  }

  if (attempted.every((d) => d.status === NotificationDeliveryStatus.SKIPPED_NO_TARGET)) {
    return NotificationDeliveryStatus.SKIPPED_NO_TARGET
  }

  if (attempted.every((d) => d.status === NotificationDeliveryStatus.SKIPPED || d.status === NotificationDeliveryStatus.SKIPPED_NO_TARGET)) {
    return NotificationDeliveryStatus.SKIPPED
  }

  return NotificationDeliveryStatus.FAILED
}

function resolveChannels(params: CreatePlatformNotificationDto): NotificationChannel[] {
  if (params.channels?.length) {
    return [...new Set(params.channels)]
  }

  if (params.recipientUserId) {
    return [NotificationChannel.WEB_PUSH]
  }

  return []
}

async function deliverWebPush(
  recipientUserId: string,
  payload: {
    type: string
    title: string
    body: string
    urlPath: string
    notificationId: string
  },
  t: TFunction,
): Promise<NotificationChannelDeliveryModel> {
  const pushResult = await webPushService.sendToUser(recipientUserId, {
    type: payload.type,
    title: payload.title,
    body: payload.body,
    url: buildAbsoluteNotificationUrl(payload.urlPath, t),
    tag: `${payload.type}:${payload.notificationId}`,
    dedupId: payload.notificationId,
    ts: Date.now(),
  })

  if (!pushResult.hadSubscriptions) {
    return {
      channel: NotificationChannel.WEB_PUSH,
      status: NotificationDeliveryStatus.SKIPPED_NO_TARGET,
      attempted: false,
      deliveredCount: 0,
      error: null,
    }
  }

  if (pushResult.deliveredCount > 0) {
    return {
      channel: NotificationChannel.WEB_PUSH,
      status: NotificationDeliveryStatus.DELIVERED,
      attempted: true,
      deliveredCount: pushResult.deliveredCount,
      error: null,
    }
  }

  return {
    channel: NotificationChannel.WEB_PUSH,
    status: NotificationDeliveryStatus.FAILED,
    attempted: true,
    deliveredCount: 0,
    error: summarizeWebPushErrors(pushResult.errors),
  }
}

async function deliverEmail(
  params: {
    recipientUserId: string
    title: string
    body: string
    urlPath: string
  },
  t: TFunction,
): Promise<NotificationChannelDeliveryModel> {
  const user = await User.findById(params.recipientUserId).select('email').lean()

  if (!user?.email?.trim()) {
    return {
      channel: NotificationChannel.EMAIL,
      status: NotificationDeliveryStatus.SKIPPED_NO_TARGET,
      attempted: false,
      deliveredCount: 0,
      error: null,
    }
  }

  const absoluteUrl = buildAbsoluteNotificationUrl(params.urlPath, t)
  const result = await emailService.sendNotificationEmail({
    to: user.email.trim(),
    subject: params.title,
    text: `${params.body}\n\n${absoluteUrl}`,
    html: `<p>${escapeHtml(params.body)}</p><p><a href="${escapeHtml(absoluteUrl)}">${escapeHtml(absoluteUrl)}</a></p>`,
  })

  if (result.sent) {
    return {
      channel: NotificationChannel.EMAIL,
      status: NotificationDeliveryStatus.DELIVERED,
      attempted: true,
      deliveredCount: 1,
      error: null,
    }
  }

  if ('skipped' in result && result.skipped) {
    return {
      channel: NotificationChannel.EMAIL,
      status: NotificationDeliveryStatus.SKIPPED,
      attempted: false,
      deliveredCount: 0,
      error: t('platformNotifications.errors.emailNotConfigured'),
    }
  }

  return {
    channel: NotificationChannel.EMAIL,
    status: NotificationDeliveryStatus.FAILED,
    attempted: true,
    deliveredCount: 0,
    error: t('platformNotifications.errors.emailSendFailed'),
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export class PlatformNotificationService {
  async createAndDeliver(params: CreatePlatformNotificationDto, t: TFunction): Promise<PlatformNotificationModel> {
    await connectDB()

    const urlPath = normalizeNotificationUrlPath(params.urlPath, t)
    const recipientUserId = params.recipientUserId?.trim() || null
    const channelsRequested = resolveChannels(params)

    if (!params.title?.trim()) {
      throw new ValidationError(t('platformNotifications.errors.titleRequired'))
    }

    if (recipientUserId && !mongoose.Types.ObjectId.isValid(recipientUserId)) {
      throw new ValidationError(t('platformNotifications.errors.invalidRecipientUserId'))
    }

    const created = await PlatformNotification.create({
      recipientUserId: recipientUserId ? new mongoose.Types.ObjectId(recipientUserId) : null,
      type: String(params.type ?? '').trim(),
      title: params.title.trim(),
      body: params.body?.trim() || params.title.trim(),
      urlPath,
      source: params.source?.trim() || null,
      channelsRequested,
      channelDeliveries: [],
      deliveryStatus: NotificationDeliveryStatus.PENDING,
      createdAt: time().toISOString(),
    })

    const notificationId = created._id.toString()
    const channelDeliveries: NotificationChannelDeliveryModel[] = []

    if (recipientUserId) {
      for (const channel of channelsRequested) {
        if (channel === NotificationChannel.WEB_PUSH) {
          channelDeliveries.push(
            await deliverWebPush(
              recipientUserId,
              {
                type: created.type,
                title: created.title,
                body: created.body,
                urlPath: created.urlPath,
                notificationId,
              },
              t,
            ),
          )
        } else if (channel === NotificationChannel.EMAIL) {
          channelDeliveries.push(
            await deliverEmail(
              {
                recipientUserId,
                title: created.title,
                body: created.body,
                urlPath: created.urlPath,
              },
              t,
            ),
          )
        }
      }
    }

    created.channelDeliveries = channelDeliveries
    created.deliveryStatus = computeAggregateDeliveryStatus(recipientUserId, channelDeliveries)
    await created.save()

    return docToModel(created)
  }

  async listPaginated(filter: PlatformNotificationFilter): Promise<PaginationMeta<PlatformNotificationModel>> {
    await connectDB()

    const data = await PlatformNotification.findListPaginated(filter)

    return {
      ...data,
      list: data.list.map((doc) => docToModel(doc)),
    }
  }
}

export const platformNotificationService = new PlatformNotificationService()
