import connectDB from '@lib/db/client'
import PlatformNotification from '@lib/db/models/PlatformNotification'
import User from '@lib/db/models/User'
import { ValidationError } from '@lib/error/custom-errors'
import { notificationsQueue } from '@lib/queues/notifications.queue'
import { enqueue } from '@lib/queues/queue'
import { isWorkerAlive } from '@lib/services/worker-health.service'
import { buildAbsoluteNotificationUrl, normalizeNotificationUrlPath } from '@lib/utils/notification-url'
import mongoose from 'mongoose'

import { NotificationChannel, type NotificationChannelDeliveryModel, NotificationDeliveryStatus, type PlatformNotificationModel } from '~/api/notification'
import type { CreatePlatformNotificationDto, PlatformNotificationFilter } from '~/api/notification/types'
import type { TFunction } from '~/lib/i18n'
import { getDefaultLocale } from '~/lib/i18n/config'
import { getT } from '~/lib/i18n/getT'
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
    // No channel was even tried. With channels configured that means every one of them was
    // skipped (mail not configured, no push subscription) — say so, do not call it delivered.
    // Without channels the in-app record itself is the delivery.
    if (deliveries.length > 0 && deliveries.every((d) => d.status === NotificationDeliveryStatus.SKIPPED_NO_TARGET)) {
      return NotificationDeliveryStatus.SKIPPED_NO_TARGET
    }

    if (deliveries.length > 0) {
      return NotificationDeliveryStatus.SKIPPED
    }

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

/** A claim older than this is a crashed attempt, not a running one. */
const DELIVERY_LEASE_MS = 5 * 60 * 1000
/** Younger than this a pending notification is just queued, not lost. */
const REQUEUE_AFTER_MS = 2 * 60 * 1000
/** Older than this it is not delivered at all: "someone signed in to your account" three days late only scares. */
const REQUEUE_WITHIN_MS = 24 * 60 * 60 * 1000
const REQUEUE_BATCH = 200
/** How long the per-channel delivery log (errors, counts) is kept. The notification itself stays. */
const DELIVERY_HISTORY_DAYS = 90
const RETENTION_BATCH = 500

export class PlatformNotificationService {
  /**
   * Record a notification and deliver it. When the worker is alive, delivery goes to the
   * `notifications` queue: the request does not wait for mail and push services, and a failing
   * channel does not slow the action the notification accompanies. Without a live worker (the
   * default deployment, local development) it is delivered right here, as before — a queue nobody
   * reads would lose it.
   */
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

    // Nobody or nothing to deliver to: the record is final at once.
    const needsDelivery = Boolean(recipientUserId) && channelsRequested.length > 0

    const created = await PlatformNotification.create({
      recipientUserId: recipientUserId ? new mongoose.Types.ObjectId(recipientUserId) : null,
      type: String(params.type ?? '').trim(),
      title: params.title.trim(),
      body: params.body?.trim() || params.title.trim(),
      urlPath,
      source: params.source?.trim() || null,
      channelsRequested,
      channelDeliveries: [],
      deliveryStatus: needsDelivery ? NotificationDeliveryStatus.PENDING : computeAggregateDeliveryStatus(recipientUserId, []),
      createdAt: time().toISOString(),
    })

    if (!needsDelivery) return docToModel(created)

    const notificationId = created._id.toString()

    if ((await isWorkerAlive()) && (await enqueue(notificationsQueue, { notificationId }, { jobId: notificationId })) === 'queued') {
      return docToModel(created)
    }

    const delivered = await this.deliver(notificationId, t)

    if (delivered) return delivered

    // Another delivery took the record — answer with what is in the database now, not the snapshot before it.
    return docToModel((await PlatformNotification.findById(notificationId)) ?? created)
  }

  /**
   * Deliver a recorded notification over its channels. Called by the worker, and by
   * `createAndDeliver` when there is no worker.
   *
   * Idempotent: the record is taken by a lease — only a pending one not taken recently by another
   * attempt. A retried job and a requeue sweep may arrive for the same record; the notification goes
   * out once. Not taken — `null`: it is delivered already or being delivered right now.
   */
  async deliver(notificationId: string, t: TFunction = getT(getDefaultLocale())): Promise<PlatformNotificationModel | null> {
    await connectDB()

    const now = new Date()
    const claimed = await PlatformNotification.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(notificationId),
        deliveryStatus: NotificationDeliveryStatus.PENDING,
        $or: [{ deliveringAt: null }, { deliveringAt: { $lt: new Date(now.getTime() - DELIVERY_LEASE_MS) } }],
      },
      { $set: { deliveringAt: now } },
      { returnDocument: 'after' },
    )

    if (!claimed) return null

    try {
      const recipientUserId = claimed.recipientUserId?.toString() ?? null
      const channelDeliveries: NotificationChannelDeliveryModel[] = []

      if (recipientUserId) {
        for (const channel of claimed.channelsRequested ?? []) {
          if (channel === NotificationChannel.WEB_PUSH) {
            channelDeliveries.push(
              await deliverWebPush(
                recipientUserId,
                { type: claimed.type, title: claimed.title, body: claimed.body, urlPath: claimed.urlPath, notificationId },
                t,
              ),
            )
          } else if (channel === NotificationChannel.EMAIL) {
            channelDeliveries.push(await deliverEmail({ recipientUserId, title: claimed.title, body: claimed.body, urlPath: claimed.urlPath }, t))
          }
        }
      }

      const deliveryStatus = computeAggregateDeliveryStatus(recipientUserId, channelDeliveries)
      // Saved only while the lease is ours: a crashed attempt whose lease expired must not overwrite a newer one.
      const finished = await PlatformNotification.updateOne(
        { _id: claimed._id, deliveringAt: now },
        { $set: { channelDeliveries, deliveryStatus, deliveringAt: null } },
      )

      if (!finished.matchedCount) throw new Error('Notification delivery lease lost')

      claimed.channelDeliveries = channelDeliveries
      claimed.deliveryStatus = deliveryStatus
      claimed.deliveringAt = null

      return docToModel(claimed)
    } catch (error) {
      // Release the lease so the retry (or the sweep) can take it at once instead of in five minutes.
      await PlatformNotification.updateOne({ _id: claimed._id, deliveringAt: now }, { $set: { deliveringAt: null } }).catch(() => undefined)

      throw error
    }
  }

  /**
   * Re-enqueue notifications stuck pending: the job was lost (Redis restarted) or the worker died
   * mid-delivery. Run by the worker on a schedule.
   */
  async requeueStuck(now: Date = new Date()): Promise<number> {
    await connectDB()

    const stuck = await PlatformNotification.find({
      deliveryStatus: NotificationDeliveryStatus.PENDING,
      createdAt: { $lt: new Date(now.getTime() - REQUEUE_AFTER_MS).toISOString(), $gt: new Date(now.getTime() - REQUEUE_WITHIN_MS).toISOString() },
      $or: [{ deliveringAt: null }, { deliveringAt: { $lt: new Date(now.getTime() - DELIVERY_LEASE_MS) } }],
    })
      .select('_id')
      .limit(REQUEUE_BATCH)
      .lean()

    for (const { _id } of stuck) {
      const notificationId = String(_id)

      // A new jobId per requeue: BullMQ does not add a job whose id still sits among completed or
      // failed ones, so the same id would silently do nothing. The lease, not the job id, rules out
      // a double delivery.
      await enqueue(notificationsQueue, { notificationId }, { jobId: `${notificationId}-${now.getTime()}` })
    }

    return stuck.length
  }

  /**
   * Retention: drop the per-channel delivery log (provider errors, counts) older than
   * DELIVERY_HISTORY_DAYS. The notification itself — title, body, link, aggregate status — stays
   * in the person's list. Run by the worker.
   */
  async sweepDeliveryHistory(now: Date = new Date()): Promise<number> {
    await connectDB()

    const cutoff = new Date(now.getTime() - DELIVERY_HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const filter = { createdAt: { $lte: cutoff }, deliveryHistoryClearedAt: null, 'channelDeliveries.0': { $exists: true } }
    const ids = await PlatformNotification.find(filter).select('_id').limit(RETENTION_BATCH).lean()

    if (!ids.length) return 0

    const result = await PlatformNotification.updateMany(
      { ...filter, _id: { $in: ids.map(({ _id }) => _id) } },
      { $set: { channelDeliveries: [], deliveryHistoryClearedAt: now } },
    )

    return result.modifiedCount
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
