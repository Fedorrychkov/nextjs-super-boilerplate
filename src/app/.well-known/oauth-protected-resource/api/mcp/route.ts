export { GET } from '../../route'

/**
 * RFC 9728 path-inserted variant: for a resource at `/api/mcp` some clients request
 * `/.well-known/oauth-protected-resource/api/mcp` directly instead of following the
 * `WWW-Authenticate: resource_metadata` pointer. Same document either way.
 */
