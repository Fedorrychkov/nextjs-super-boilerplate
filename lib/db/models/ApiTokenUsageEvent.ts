import mongoose, { type Document, type Model, Schema } from 'mongoose'

/**
 * One machine-auth request = one event (full time series for the admin "usage" view).
 *
 * Written fire-and-forget from `withApiTokenOrAuth` (REST) and `/api/mcp` (per tools/call),
 * so it never adds latency to the request path. A TTL index keeps the collection bounded
 * (`API_TOKEN_USAGE_RETENTION_DAYS`, default 30).
 *
 * Note: an MCP tool call produces TWO events — one `mcp` (the tool call itself) and one `rest`
 * (the internal `/api/v1/*` request it makes). Both are real handled requests; window counters
 * in the admin UI are split by transport so this is visible, not confusing.
 */
export interface IApiTokenUsageEvent extends Document {
  tokenId: mongoose.Types.ObjectId
  ownerUserId: mongoose.Types.ObjectId
  /** Token kind snapshot (`pat` | `oauth`) — survives token deletion for historical charts. */
  kind: string
  /** `rest` — direct /api/v1 call; `mcp` — a tools/call on /api/mcp. */
  transport: 'rest' | 'mcp'
  method: string
  path: string
  /** MCP tool name for `transport: 'mcp'`. */
  tool?: string | null
  createdAt: Date
}

/**
 * TTL is read once at schema definition (deploy-time). Changing the env on a live instance
 * requires dropping the `createdAt_1` index so Mongoose can recreate it with the new TTL.
 */
const RETENTION_DAYS = Math.max(1, Number(process.env.API_TOKEN_USAGE_RETENTION_DAYS) || 30)

const ApiTokenUsageEventSchema: Schema<IApiTokenUsageEvent> = new Schema<IApiTokenUsageEvent>(
  {
    tokenId: {
      type: Schema.Types.ObjectId,
      ref: 'ApiToken',
      required: true,
    },
    ownerUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    kind: {
      type: String,
      required: true,
    },
    transport: {
      type: String,
      enum: ['rest', 'mcp'],
      required: true,
    },
    method: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    tool: {
      type: String,
      default: null,
    },
    createdAt: {
      type: Date,
      default: () => new Date(),
      index: { expireAfterSeconds: RETENTION_DAYS * 24 * 60 * 60 },
    },
  },
  {
    timestamps: false,
  },
)

// Window counters are always "per token/user for the last N hours" — compound indexes make them cheap.
ApiTokenUsageEventSchema.index({ tokenId: 1, createdAt: -1 })
ApiTokenUsageEventSchema.index({ ownerUserId: 1, createdAt: -1 })

const ApiTokenUsageEvent: Model<IApiTokenUsageEvent> =
  (mongoose.models.ApiTokenUsageEvent as Model<IApiTokenUsageEvent> | undefined) ||
  mongoose.model<IApiTokenUsageEvent>('ApiTokenUsageEvent', ApiTokenUsageEventSchema)

export default ApiTokenUsageEvent
