import mongoose, { type Document, type Model, Schema } from 'mongoose'

/**
 * One-time authorization code (OAuth 2.1 authorization_code grant with mandatory PKCE S256).
 *
 * The raw code is never stored — only its sha256. TTL index removes expired codes automatically;
 * within the validity window a second exchange attempt is detected via `usedAt` and revokes
 * everything issued for the first exchange (code interception defense).
 */
export interface IMcpOAuthAuthorizationCode extends Document {
  /** sha256 hex of the raw code. */
  codeHash: string
  clientId: string
  userId: mongoose.Types.ObjectId
  redirectUri: string
  /** PKCE S256 challenge from the authorize request; verified against `sha256(code_verifier)` at exchange. */
  codeChallenge: string
  /** Scopes approved by the user on the consent screen (already clamped by the role policy). */
  scopes: string[]
  /** Grant lifetime in days chosen on the consent screen (clamped by the role policy at consent time). */
  expiresDays: number
  /** RFC 8707 resource indicator from the authorize request, if provided. */
  resource?: string | null
  /** Grant issued by the (first) successful exchange — revoked if the code is replayed. */
  usedAt?: Date | null
  usedByGrantId?: mongoose.Types.ObjectId | null
  expiresAt: Date
  createdAt: Date
}

const McpOAuthAuthorizationCodeSchema: Schema<IMcpOAuthAuthorizationCode> = new Schema<IMcpOAuthAuthorizationCode>(
  {
    codeHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    clientId: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    redirectUri: {
      type: String,
      required: true,
    },
    codeChallenge: {
      type: String,
      required: true,
    },
    scopes: {
      type: [String],
      default: [],
    },
    expiresDays: {
      type: Number,
      required: true,
    },
    resource: {
      type: String,
      default: null,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    usedByGrantId: {
      type: Schema.Types.ObjectId,
      ref: 'McpOAuthGrant',
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      // Mongo TTL granularity is ~60s; the code itself expires in 60s (checked explicitly at exchange).
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
)

const McpOAuthAuthorizationCode: Model<IMcpOAuthAuthorizationCode> =
  (mongoose.models.McpOAuthAuthorizationCode as Model<IMcpOAuthAuthorizationCode> | undefined) ||
  mongoose.model<IMcpOAuthAuthorizationCode>('McpOAuthAuthorizationCode', McpOAuthAuthorizationCodeSchema)

export default McpOAuthAuthorizationCode
