import assert from 'node:assert/strict'
import test from 'node:test'

import { UserRole } from '../user/model'
import { API_TOKEN_SCOPES } from './model'
import {
  API_TOKEN_ABSOLUTE_MAX_EXPIRES_DAYS,
  API_TOKEN_DEFAULT_EXPIRES_DAYS,
  type ApiTokenRolePolicyModel,
  capApiTokenRole,
  clampExpiresDays,
  filterApiTokenScopes,
  isKnownApiTokenScope,
  normalizeApiTokenKinds,
  resolveApiTokenPermissions,
} from './permissions'

const policy = (overrides: Partial<ApiTokenRolePolicyModel> = {}): ApiTokenRolePolicyModel => ({
  role: UserRole.EDITOR,
  enabled: true,
  allowedScopes: ['articles:read', 'articles:write'],
  allowedKinds: ['pat', 'oauth'],
  maxExpiresDays: 30,
  ...overrides,
})

test('resolveApiTokenPermissions: admin is always fully allowed, policies cannot restrict it', () => {
  const restrictive = policy({ role: UserRole.ADMIN, enabled: false, allowedScopes: [] })
  const result = resolveApiTokenPermissions(UserRole.ADMIN, [restrictive])

  assert.equal(result.allowed, true)
  assert.equal(result.isAdmin, true)
  assert.deepEqual(result.allowedScopes, [...API_TOKEN_SCOPES])
  assert.equal(result.maxExpiresDays, API_TOKEN_ABSOLUTE_MAX_EXPIRES_DAYS)
})

test('resolveApiTokenPermissions: role without a policy is denied (future roles are safe by default)', () => {
  const result = resolveApiTokenPermissions('moderator', [policy()])

  assert.equal(result.allowed, false)
  assert.deepEqual(result.allowedScopes, [])
})

test('resolveApiTokenPermissions: disabled policy denies the role', () => {
  const result = resolveApiTokenPermissions(UserRole.EDITOR, [policy({ enabled: false })])

  assert.equal(result.allowed, false)
})

test('resolveApiTokenPermissions: enabled policy grants only its known scopes', () => {
  const withUnknown = policy({ allowedScopes: ['articles:read', 'orders:read', 'articles:read'] as never })
  const result = resolveApiTokenPermissions(UserRole.EDITOR, [withUnknown])

  assert.equal(result.allowed, true)
  assert.equal(result.isAdmin, false)
  assert.deepEqual(result.allowedScopes, ['articles:read'])
})

test('resolveApiTokenPermissions: policy with no known scopes denies the role', () => {
  const result = resolveApiTokenPermissions(UserRole.EDITOR, [policy({ allowedScopes: ['orders:read'] as never })])

  assert.equal(result.allowed, false)
})

test('resolveApiTokenPermissions: future custom role works via its own policy', () => {
  const custom = policy({ role: 'content-manager', allowedScopes: ['articles:read', 'articles:write', 'media:write'], maxExpiresDays: 500 })
  const result = resolveApiTokenPermissions('content-manager', [custom])

  assert.equal(result.allowed, true)
  assert.deepEqual(result.allowedScopes, ['articles:read', 'articles:write', 'media:write'])
  assert.equal(result.maxExpiresDays, API_TOKEN_ABSOLUTE_MAX_EXPIRES_DAYS, 'maxExpiresDays is clamped to the absolute cap')
})

test('clampExpiresDays: falls back to default and respects the max', () => {
  assert.equal(clampExpiresDays(undefined, 365), API_TOKEN_DEFAULT_EXPIRES_DAYS)
  assert.equal(clampExpiresDays(null, 30), 30, 'fallback is capped by max when max < default')
  assert.equal(clampExpiresDays(Number.NaN, 365), API_TOKEN_DEFAULT_EXPIRES_DAYS)
})

test('clampExpiresDays: clamps into [1, max] and floors fractions', () => {
  assert.equal(clampExpiresDays(0, 365), 1)
  assert.equal(clampExpiresDays(-5, 365), 1)
  assert.equal(clampExpiresDays(14.9, 365), 14)
  assert.equal(clampExpiresDays(1000, 365), 365)
  assert.equal(clampExpiresDays(90, 30), 30)
})

test('clampExpiresDays: max itself is capped by the absolute limit', () => {
  assert.equal(clampExpiresDays(9999, 9999), API_TOKEN_ABSOLUTE_MAX_EXPIRES_DAYS)
})

test('filterApiTokenScopes: dedupes, drops unknown scopes and intersects with allowed', () => {
  const result = filterApiTokenScopes(['articles:read', 'articles:read', 'orders:read', 'articles:publish'], ['articles:read', 'articles:write'])

  assert.deepEqual(result, ['articles:read'])
})

test('filterApiTokenScopes: empty inputs produce empty output', () => {
  assert.deepEqual(filterApiTokenScopes([], API_TOKEN_SCOPES), [])
  assert.deepEqual(filterApiTokenScopes(['articles:read'], []), [])
})

test('isKnownApiTokenScope: matches the scope registry', () => {
  for (const scope of API_TOKEN_SCOPES) {
    assert.equal(isKnownApiTokenScope(scope), true)
  }

  assert.equal(isKnownApiTokenScope('orders:read'), false)
  assert.equal(isKnownApiTokenScope(''), false)
})

test('capApiTokenRole: token role never exceeds the owner current role', () => {
  assert.equal(capApiTokenRole(UserRole.ADMIN, UserRole.EDITOR), UserRole.EDITOR, 'owner demoted → token capped')
  assert.equal(capApiTokenRole(UserRole.EDITOR, UserRole.ADMIN), UserRole.EDITOR, 'owner promoted → token keeps its role')
  assert.equal(capApiTokenRole(UserRole.USER, UserRole.USER), UserRole.USER)
})

test('capApiTokenRole: unknown roles weigh 0 and can never escalate', () => {
  assert.equal(capApiTokenRole<string>('moderator', UserRole.USER), 'moderator', 'unknown token role stays (weight 0 ≤ any)')
  assert.equal(capApiTokenRole<string>(UserRole.ADMIN, 'moderator'), 'moderator', 'unknown owner role caps a stronger token role')
})

test('resolveApiTokenPermissions: allowedKinds narrows the auth channels', () => {
  const oauthOnly = resolveApiTokenPermissions(UserRole.EDITOR, [policy({ allowedKinds: ['oauth'] })])

  assert.equal(oauthOnly.allowed, true)
  assert.deepEqual(oauthOnly.allowedKinds, ['oauth'])

  const patOnly = resolveApiTokenPermissions(UserRole.EDITOR, [policy({ allowedKinds: ['pat'] })])

  assert.deepEqual(patOnly.allowedKinds, ['pat'])
})

test('resolveApiTokenPermissions: empty allowedKinds denies the role entirely', () => {
  const result = resolveApiTokenPermissions(UserRole.EDITOR, [policy({ allowedKinds: [] })])

  assert.equal(result.allowed, false)
  assert.deepEqual(result.allowedKinds, [])
})

test('resolveApiTokenPermissions: admin always has every kind', () => {
  const result = resolveApiTokenPermissions(UserRole.ADMIN, [])

  assert.deepEqual(result.allowedKinds, ['pat', 'oauth'])
})

test('normalizeApiTokenKinds: missing field means both (pre-split policies), unknown kinds are dropped', () => {
  assert.deepEqual(normalizeApiTokenKinds(undefined), ['pat', 'oauth'])
  assert.deepEqual(normalizeApiTokenKinds(null), ['pat', 'oauth'])
  assert.deepEqual(normalizeApiTokenKinds(['oauth', 'oauth', 'bogus']), ['oauth'])
  assert.deepEqual(normalizeApiTokenKinds(['bogus']), [])
})
