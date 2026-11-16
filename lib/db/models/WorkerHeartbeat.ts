import mongoose, { type Model, Schema } from 'mongoose'

/**
 * "The worker is alive" mark. One record per worker process (`_id` = name), rewritten on a
 * schedule. The healthcheck API reads it — see `lib/services/worker-health.ts`.
 */
export interface IWorkerHeartbeat {
  _id: string
  beatAt: Date
  startedAt: Date
  host: string | null
  pid: number | null
}

const WorkerHeartbeatSchema = new Schema<IWorkerHeartbeat>(
  {
    _id: { type: String, required: true },
    beatAt: { type: Date, required: true },
    startedAt: { type: Date, required: true },
    host: { type: String, default: null },
    pid: { type: Number, default: null },
  },
  { timestamps: false, versionKey: false },
)

const WorkerHeartbeat: Model<IWorkerHeartbeat> =
  (mongoose.models.WorkerHeartbeat as Model<IWorkerHeartbeat>) || mongoose.model<IWorkerHeartbeat>('WorkerHeartbeat', WorkerHeartbeatSchema)

export default WorkerHeartbeat
