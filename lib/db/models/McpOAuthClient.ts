import mongoose, { type Document, type Model, Schema } from 'mongoose'

/**
 * OAuth client registered via Dynamic Client Registration (RFC 7591) by an MCP host
 * (Claude.ai/Desktop registers a fresh client on every new connection).
 *
 * All clients are public (PKCE instead of a secret), so no secret is stored.
 * Stale clients without grants are lazily cleaned up on register — see `cleanupStaleMcpOAuthClients`.
 */
export interface IMcpOAuthClient extends Document {
  /** `<brand>_mcp_client_<32 hex>` — issued by us, sent back as `client_id`. */
  clientId: string
  clientName: string
  /** RFC 7591: `none` (public, PKCE only) or `client_secret_basic`/`client_secret_post` (confidential — Claude hosted surfaces). */
  tokenEndpointAuthMethod: string
  /** sha256 of the issued client_secret (confidential clients only). PKCE stays mandatory regardless. */
  clientSecretHash?: string | null
  redirectUris: string[]
  clientUri?: string | null
  logoUri?: string | null
  /** Number of grants ever issued to this client — cheap guard for the lazy cleanup (never deletes used clients). */
  grantsCount: number
  lastUsedAt: Date
  createdAt: Date
}

const McpOAuthClientSchema: Schema<IMcpOAuthClient> = new Schema<IMcpOAuthClient>(
  {
    clientId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    clientName: {
      type: String,
      required: true,
      trim: true,
    },
    tokenEndpointAuthMethod: {
      type: String,
      default: 'none',
    },
    clientSecretHash: {
      type: String,
      default: null,
    },
    redirectUris: {
      type: [String],
      required: true,
    },
    clientUri: {
      type: String,
      default: null,
    },
    logoUri: {
      type: String,
      default: null,
    },
    grantsCount: {
      type: Number,
      default: 0,
    },
    lastUsedAt: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
)

const McpOAuthClient: Model<IMcpOAuthClient> =
  (mongoose.models.McpOAuthClient as Model<IMcpOAuthClient> | undefined) || mongoose.model<IMcpOAuthClient>('McpOAuthClient', McpOAuthClientSchema)

export default McpOAuthClient
