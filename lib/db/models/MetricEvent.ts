import mongoose, { type Model, Schema } from 'mongoose'

/**
 * A product event or an error kept by the `mongo` metrics sink. `expireAt` is set per event from
 * the `metrics.retentionDays` setting at write time, and the TTL index removes it — changing the
 * setting applies to new events without rebuilding the index.
 */
export interface IMetricEvent {
  uuid: string
  name: string
  props: Record<string, string | boolean>
  distinctId: string
  side: 'server' | 'client'
  route: string | null
  env: string
  at: Date
  error: { type: string; message: string; stack?: string } | null
  expireAt: Date
}

const MetricEventSchema = new Schema<IMetricEvent>(
  {
    uuid: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    props: { type: Schema.Types.Mixed, default: {} },
    distinctId: { type: String, required: true },
    side: { type: String, enum: ['server', 'client'], required: true },
    route: { type: String, default: null },
    env: { type: String, required: true },
    at: { type: Date, required: true },
    error: { type: Schema.Types.Mixed, default: null },
    expireAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { versionKey: false, minimize: false },
)

// The admin summary reads "events by name per day" and "recent errors".
MetricEventSchema.index({ at: -1, name: 1 })

const MetricEvent: Model<IMetricEvent> = (mongoose.models.MetricEvent as Model<IMetricEvent>) || mongoose.model<IMetricEvent>('MetricEvent', MetricEventSchema)

export default MetricEvent
