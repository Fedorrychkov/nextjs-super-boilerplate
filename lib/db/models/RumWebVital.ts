import mongoose, { Document, Schema } from 'mongoose'

import { RUM_METRIC_NAMES, RumWebVitalModel } from '~/api/rum/model'
import { time } from '~/utils/time'

export interface IRumWebVital extends Document, Omit<RumWebVitalModel, 'id'> {}

const FOURTEEN_DAYS_SEC = 14 * 24 * 60 * 60

const RumWebVitalSchema = new Schema<IRumWebVital>(
  {
    name: {
      type: String,
      required: true,
      enum: RUM_METRIC_NAMES,
      index: true,
    },
    value: { type: Number, required: true },
    rating: { type: String, default: null },
    metricId: { type: String, default: null },
    navigationType: { type: String, default: null },
    pathname: { type: String, required: true, maxlength: 1024, index: true },
    delta: { type: Number, default: null },
    commitHash: { type: String, default: null, index: true },
    appEnv: { type: String, default: null },
    connectionEffectiveType: { type: String, default: null },
    createdAt: {
      type: Date,
      default: () => time().toISOString(),
    },
  },
  { versionKey: false },
)

RumWebVitalSchema.index({ createdAt: 1 }, { expireAfterSeconds: FOURTEEN_DAYS_SEC })

const RumWebVital = (mongoose.models.RumWebVital as mongoose.Model<IRumWebVital>) || mongoose.model<IRumWebVital>('RumWebVital', RumWebVitalSchema)

export default RumWebVital
