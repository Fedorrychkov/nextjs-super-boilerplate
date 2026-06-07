import mongoose, { type Document, type HydratedDocument, type Model, type QueryFilter, Schema } from 'mongoose'

import { NotificationChannel, type NotificationChannelDeliveryModel, NotificationDeliveryStatus, type PlatformNotificationModel } from '~/api/notification'
import type { PlatformNotificationFilter } from '~/api/notification/types'
import type { PaginationMeta } from '~/types/pagination'
import { time } from '~/utils/time'

import { applyCreatedAtRange } from '../utils/applyCreatedAtRange'
import { buildPaginationMeta, clampLimit } from '../utils/buildPaginationMeta'

const ChannelDeliverySchema = new Schema<NotificationChannelDeliveryModel>(
  {
    channel: {
      type: String,
      enum: Object.values(NotificationChannel),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(NotificationDeliveryStatus),
      required: true,
    },
    attempted: {
      type: Boolean,
      required: true,
      default: false,
    },
    deliveredCount: {
      type: Number,
      default: null,
    },
    error: {
      type: String,
      default: null,
      maxlength: 500,
    },
  },
  { _id: false },
)

export interface IPlatformNotification extends Document, Omit<PlatformNotificationModel, 'id' | 'recipientUserId'> {
  recipientUserId: mongoose.Types.ObjectId | null
}

export interface IPlatformNotificationModel extends Model<IPlatformNotification> {
  findListPaginated(filter: PlatformNotificationFilter): Promise<PaginationMeta<HydratedDocument<IPlatformNotification>>>
}

function applyNotificationFilterFields(q: QueryFilter<IPlatformNotification>, filter: PlatformNotificationFilter) {
  if (filter.recipientUserId != null && String(filter.recipientUserId).trim()) {
    if (mongoose.Types.ObjectId.isValid(String(filter.recipientUserId))) {
      q.recipientUserId = new mongoose.Types.ObjectId(String(filter.recipientUserId))
    }
  }

  if (filter.deliveryStatus != null && String(filter.deliveryStatus).trim()) {
    const deliveryStatus = String(filter.deliveryStatus).trim()

    if ((Object.values(NotificationDeliveryStatus) as string[]).includes(deliveryStatus)) {
      q.deliveryStatus = deliveryStatus as NotificationDeliveryStatus
    }
  }

  if (filter.type != null && String(filter.type).trim()) {
    q.type = String(filter.type).trim()
  }
}

const PlatformNotificationSchema: Schema<IPlatformNotification> = new Schema<IPlatformNotification>(
  {
    _id: {
      type: Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    recipientUserId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    urlPath: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      default: null,
      trim: true,
    },
    channelsRequested: {
      type: [String],
      enum: Object.values(NotificationChannel),
      default: [],
    },
    channelDeliveries: {
      type: [ChannelDeliverySchema],
      default: [],
    },
    deliveryStatus: {
      type: String,
      enum: Object.values(NotificationDeliveryStatus),
      required: true,
      default: NotificationDeliveryStatus.PENDING,
      index: true,
    },
    createdAt: {
      type: String,
      default: () => time().toISOString(),
      index: true,
    },
  },
  {
    timestamps: false,
  },
)

PlatformNotificationSchema.index({ recipientUserId: 1, createdAt: -1 })
;(PlatformNotificationSchema.statics as Record<string, unknown>).findListPaginated = async function findListPaginated(
  this: Model<IPlatformNotification>,
  filter: PlatformNotificationFilter,
): Promise<PaginationMeta<HydratedDocument<IPlatformNotification>>> {
  const { limit: limitRaw, offset: offsetRaw, startOfDateIso, endOfDateIso, ...rest } = filter

  const limit = clampLimit(typeof limitRaw === 'number' ? limitRaw : Number(limitRaw))
  const offset = typeof offsetRaw === 'number' ? Math.max(0, Math.floor(offsetRaw)) : Math.max(0, Number(offsetRaw) || 0)

  const base: QueryFilter<IPlatformNotification> = {}
  applyNotificationFilterFields(base, rest)
  applyCreatedAtRange<IPlatformNotification>(base, startOfDateIso, endOfDateIso)

  const count = await this.countDocuments(base)
  const list = await this.find(base).sort({ createdAt: -1, _id: -1 }).skip(offset).limit(limit).exec()

  return buildPaginationMeta({
    list,
    count,
    limit: typeof limitRaw === 'number' ? limitRaw : Number(limitRaw),
    offset: typeof offsetRaw === 'number' ? offsetRaw : Number(offsetRaw),
  })
}

const PlatformNotification: IPlatformNotificationModel =
  (mongoose.models.PlatformNotification as IPlatformNotificationModel) ||
  mongoose.model<IPlatformNotification, IPlatformNotificationModel>('PlatformNotification', PlatformNotificationSchema)

export default PlatformNotification
