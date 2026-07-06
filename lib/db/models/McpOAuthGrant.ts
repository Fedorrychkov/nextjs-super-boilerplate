import mongoose, { type Document, type Model, Schema } from 'mongoose'

/**
 * A user↔client OAuth "connection": the long-lived envelope around short-lived access tokens.
 *
 * The current access token is a regular `ApiToken` (`kind: 'oauth'`, `grantId` back-reference),
 * so scopes / role policies / rate limits / audit are enforced by the existing PAT machinery.
 * The refresh token is stored as sha256 and rotated on every refresh; presenting the previous
 * (already rotated) refresh token is treated as theft and revokes the whole grant.
 *
 * No TTL index on purpose: expired grants stay visible for audit, same as ApiToken.
 */
export interface IMcpOAuthGrant extends Document {
  userId: mongoose.Types.ObjectId
  clientId: string
  /** Snapshot for UI/audit — DCR clients are disposable, the name outlives them. */
  clientName: string
  scopes: string[]
  /** Current access token (ApiToken, kind 'oauth'). Replaced on every refresh; the old one is revoked. */
  apiTokenId: mongoose.Types.ObjectId
  /** sha256 hex of the current refresh token. */
  refreshTokenHash: string
  /** sha256 hex of the previous refresh token — kept for one rotation to detect replay (reuse = revoke grant). */
  prevRefreshTokenHash?: string | null
  /** Hard end of the grant (consent-screen lifetime, clamped by the role policy). Refresh never extends past this. */
  expiresAt: Date
  revokedAt?: Date | null
  lastRefreshedAt?: Date | null
  createdAt: Date
}

const McpOAuthGrantSchema: Schema<IMcpOAuthGrant> = new Schema<IMcpOAuthGrant>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    clientId: {
      type: String,
      required: true,
      index: true,
    },
    clientName: {
      type: String,
      required: true,
    },
    scopes: {
      type: [String],
      default: [],
    },
    apiTokenId: {
      type: Schema.Types.ObjectId,
      ref: 'ApiToken',
      required: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    prevRefreshTokenHash: {
      type: String,
      default: null,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    lastRefreshedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
)

const McpOAuthGrant: Model<IMcpOAuthGrant> =
  (mongoose.models.McpOAuthGrant as Model<IMcpOAuthGrant> | undefined) || mongoose.model<IMcpOAuthGrant>('McpOAuthGrant', McpOAuthGrantSchema)

export default McpOAuthGrant
