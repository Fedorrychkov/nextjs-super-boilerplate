import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import test from 'node:test'

import {
  canonicalMcpResource,
  isAcceptableResource,
  isLoopbackRedirectUri,
  isRegistrableRedirectUri,
  isValidCodeChallenge,
  matchRedirectUri,
  validateDcrRequest,
  verifyPkceS256,
} from './mcp-oauth.helpers'

// #region PKCE

test('verifyPkceS256 accepts a matching verifier/challenge pair', () => {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')

  assert.equal(verifyPkceS256(verifier, challenge), true)
})

test('verifyPkceS256 rejects a wrong verifier', () => {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')

  assert.equal(verifyPkceS256(randomBytes(32).toString('base64url'), challenge), false)
})

test('verifyPkceS256 rejects malformed verifiers (too short / bad charset)', () => {
  const challenge = createHash('sha256').update('x').digest('base64url')

  assert.equal(verifyPkceS256('short', challenge), false)
  assert.equal(verifyPkceS256('!'.repeat(50), challenge), false)
})

test('isValidCodeChallenge checks the base64url(sha256) shape', () => {
  assert.equal(isValidCodeChallenge(createHash('sha256').update('anything').digest('base64url')), true)
  assert.equal(isValidCodeChallenge('not-a-challenge'), false)
  assert.equal(isValidCodeChallenge(''), false)
})

// #endregion

// #region Redirect URIs

test('loopback detection: http only for localhost/127.0.0.1', () => {
  assert.equal(isLoopbackRedirectUri('http://localhost:3118/callback'), true)
  assert.equal(isLoopbackRedirectUri('http://127.0.0.1:49152/callback'), true)
  assert.equal(isLoopbackRedirectUri('http://evil.com/callback'), false)
  assert.equal(isLoopbackRedirectUri('https://localhost/callback'), false)
})

test('registrable redirect URIs: https or loopback, no fragments', () => {
  assert.equal(isRegistrableRedirectUri('https://claude.ai/api/mcp/auth_callback'), true)
  assert.equal(isRegistrableRedirectUri('http://localhost/callback'), true)
  assert.equal(isRegistrableRedirectUri('http://example.com/callback'), false)
  assert.equal(isRegistrableRedirectUri('https://claude.ai/callback#fragment'), false)
  assert.equal(isRegistrableRedirectUri('not a url'), false)
})

test('https redirect URIs match exactly', () => {
  const registered = ['https://claude.ai/api/mcp/auth_callback']

  assert.equal(matchRedirectUri(registered, 'https://claude.ai/api/mcp/auth_callback'), true)
  assert.equal(matchRedirectUri(registered, 'https://claude.ai/api/mcp/auth_callback/extra'), false)
  assert.equal(matchRedirectUri(registered, 'https://claude.evil.com/api/mcp/auth_callback'), false)
})

test('loopback redirect URIs match ignoring the port (Claude Code, RFC 8252)', () => {
  const registered = ['http://localhost/callback', 'http://127.0.0.1/callback']

  assert.equal(matchRedirectUri(registered, 'http://localhost:3118/callback'), true)
  assert.equal(matchRedirectUri(registered, 'http://127.0.0.1:49152/callback'), true)
  assert.equal(matchRedirectUri(registered, 'http://localhost:3118/other'), false)
  assert.equal(matchRedirectUri(registered, 'http://192.168.0.10:3118/callback'), false)
})

test('port-agnostic matching never applies to non-loopback URIs', () => {
  const registered = ['https://claude.ai/api/mcp/auth_callback']

  assert.equal(matchRedirectUri(registered, 'https://claude.ai:8443/api/mcp/auth_callback'), false)
})

// #endregion

// #region Resource indicator

test('canonical resource is origin + /api/mcp', () => {
  assert.equal(canonicalMcpResource('https://example.com'), 'https://example.com/api/mcp')
  assert.equal(canonicalMcpResource('https://example.com/'), 'https://example.com/api/mcp')
})

test('resource param: absent is tolerated, exact match accepted, mismatch rejected', () => {
  const origin = 'https://example.com'

  assert.equal(isAcceptableResource(null, origin), true)
  assert.equal(isAcceptableResource(undefined, origin), true)
  assert.equal(isAcceptableResource('https://example.com/api/mcp', origin), true)
  assert.equal(isAcceptableResource('https://EXAMPLE.com/api/mcp', origin), true)
  assert.equal(isAcceptableResource('https://example.com/api/mcp/', origin), true)
  assert.equal(isAcceptableResource('https://other.com/api/mcp', origin), false)
  assert.equal(isAcceptableResource('https://example.com/api/other', origin), false)
  assert.equal(isAcceptableResource('https://example.com/api/mcp#frag', origin), false)
  assert.equal(isAcceptableResource('not a url', origin), false)
})

// #endregion

// #region DCR validation

test('DCR: valid Claude-style registration passes (public client)', () => {
  const result = validateDcrRequest({
    redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
    client_name: 'Claude',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
  })

  assert.equal(result.ok, true)

  if (result.ok) {
    assert.deepEqual(result.redirectUris, ['https://claude.ai/api/mcp/auth_callback'])
    assert.equal(result.clientName, 'Claude')
    assert.equal(result.tokenEndpointAuthMethod, 'none')
  }
})

test('DCR: confidential clients are accepted; omitted method defaults to client_secret_basic (RFC 7591)', () => {
  const base = { redirect_uris: ['https://claude.ai/api/mcp/auth_callback'] }

  const omitted = validateDcrRequest(base)

  assert.equal(omitted.ok, true)

  if (omitted.ok) {
    assert.equal(omitted.tokenEndpointAuthMethod, 'client_secret_basic')
  }

  const post = validateDcrRequest({ ...base, token_endpoint_auth_method: 'client_secret_post' })

  assert.equal(post.ok, true)

  if (post.ok) {
    assert.equal(post.tokenEndpointAuthMethod, 'client_secret_post')
  }
})

test('DCR: missing or invalid redirect_uris are rejected', () => {
  assert.equal(validateDcrRequest({}).ok, false)
  assert.equal(validateDcrRequest({ redirect_uris: [] }).ok, false)
  assert.equal(validateDcrRequest({ redirect_uris: ['http://evil.com/callback'] }).ok, false)
  assert.equal(validateDcrRequest({ redirect_uris: [123] }).ok, false)
})

test('DCR: unsupported auth methods and foreign grant types are rejected', () => {
  const base = { redirect_uris: ['https://claude.ai/api/mcp/auth_callback'] }

  assert.equal(validateDcrRequest({ ...base, token_endpoint_auth_method: 'private_key_jwt' }).ok, false)
  assert.equal(validateDcrRequest({ ...base, grant_types: ['client_credentials'] }).ok, false)
  assert.equal(validateDcrRequest({ ...base, response_types: ['token'] }).ok, false)
})

test('DCR: defaults are applied (client name fallback, non-https metadata URIs dropped)', () => {
  const result = validateDcrRequest({
    redirect_uris: ['http://localhost/callback'],
    client_uri: 'javascript:alert(1)',
    logo_uri: 'http://plain-http.example/logo.png',
  })

  assert.equal(result.ok, true)

  if (result.ok) {
    assert.equal(result.clientName, 'MCP client')
    assert.equal(result.clientUri, null)
    assert.equal(result.logoUri, null)
  }
})

// #endregion
