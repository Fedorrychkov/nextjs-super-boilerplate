import mongoose, { type Document, type Model, Schema } from 'mongoose'

/**
 * Per-role policy for Personal Access Tokens: whether a role may issue PATs,
 * which scopes it may grant and the max token lifetime.
 *
 * `role` is a plain string on purpose — downstream projects can enable roles
 * that do not exist in the boilerplate's `UserRole` enum yet.
 * Admins are never restricted by policies (see `resolveApiTokenPermissions`).
 */
export interface IApiTokenRolePolicy extends Document {
  role: string
  enabled: boolean
  allowedScopes: string[]
  /** Auth channels the role may use: `pat` (manual tokens) and/or `oauth` (MCP-host connections). */
  allowedKinds: string[]
  maxExpiresDays: number
  updatedBy?: mongoose.Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const ApiTokenRolePolicySchema: Schema<IApiTokenRolePolicy> = new Schema<IApiTokenRolePolicy>(
  {
    role: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    allowedScopes: {
      type: [String],
      default: [],
    },
    // Default "both": policies created before the kind split keep their old semantics.
    allowedKinds: {
      type: [String],
      default: ['pat', 'oauth'],
    },
    maxExpiresDays: {
      type: Number,
      default: 90,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

const ApiTokenRolePolicy: Model<IApiTokenRolePolicy> =
  (mongoose.models.ApiTokenRolePolicy as Model<IApiTokenRolePolicy> | undefined) ||
  mongoose.model<IApiTokenRolePolicy>('ApiTokenRolePolicy', ApiTokenRolePolicySchema)

export default ApiTokenRolePolicy
