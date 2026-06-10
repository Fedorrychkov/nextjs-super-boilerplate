import { OAUTH_CONFIG } from '@config/auth-oauth'
import connectDB from '@lib/db/client'
import User from '@lib/db/models/User'
import UserSettings from '@lib/db/models/UserSettings'
import { ValidationError } from '@lib/error/custom-errors'
import { createLoginChallenge } from '@lib/security/login-challenge'
import { authService } from '@lib/services/auth.service'
import type { RequestClientMeta } from '@lib/utils/request-client-meta'

import type { AuthResponse } from '~/api/auth/model'
import type { OAuthFlow, OAuthProviderId } from '~/api/oauth'
import { UserStatus } from '~/api/user'
import type { TFunction } from '~/lib/i18n'

import { createOAuthAccount, createOAuthUser, findOAuthAccount, type OAuthFlowContext, touchOAuthAccount } from './oauth-account.service'
import { buildInternalOAuthEmail, findUserByEmailForCollision, logOAuthAttempt } from './oauth-collision.service'
import { buildOAuthLoginRedirect, buildProfileRedirect } from './oauth-redirect'

export type OAuthFlowResult = { kind: 'redirect'; url: string } | { kind: 'auth'; auth: AuthResponse }

async function userRequiresMfa(userId: string): Promise<boolean> {
  await connectDB()

  const settings = await UserSettings.findOne({ userId })

  return Boolean(settings?.mfaEnabled && settings?.mfaSecret)
}

async function completeLoginForUser(
  userId: string,
  options: { languageCode?: string | null; clientMeta?: RequestClientMeta | null; nextPath?: string | null },
): Promise<OAuthFlowResult> {
  await connectDB()

  const user = await User.findById(userId)

  if (!user || user.status !== UserStatus.ACTIVE) {
    throw new ValidationError('User not found or inactive')
  }

  if (await userRequiresMfa(userId)) {
    const challengeId = await createLoginChallenge(userId)

    return {
      kind: 'redirect',
      url: buildOAuthLoginRedirect({
        oauthMfaChallenge: challengeId,
        variant: 'sign-in',
        nextPath: options.nextPath,
      }),
    }
  }

  const auth = await authService.createAuthTokensForUser(user, options)

  return { kind: 'auth', auth }
}

export async function handleOAuthAuthCallback(
  ctx: OAuthFlowContext & {
    clientMeta?: RequestClientMeta | null
    nextPath?: string | null
    t: TFunction
  },
): Promise<OAuthFlowResult> {
  const existing = await findOAuthAccount(ctx.provider, ctx.profile.providerUserId)

  if (ctx.flow === 'signIn') {
    if (!existing) {
      await logOAuthAttempt({
        provider: ctx.provider,
        providerUserId: ctx.profile.providerUserId,
        providerEmail: ctx.profile.email,
        flow: ctx.flow,
        outcome: 'not_found',
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      })

      return {
        kind: 'redirect',
        url: buildOAuthLoginRedirect({
          oauthError: 'oauth_account_not_found',
          variant: 'sign-in',
          nextPath: ctx.nextPath,
        }),
      }
    }

    await touchOAuthAccount(existing, ctx.profile)

    await logOAuthAttempt({
      provider: ctx.provider,
      providerUserId: ctx.profile.providerUserId,
      providerEmail: ctx.profile.email,
      flow: ctx.flow,
      outcome: 'success',
      actorUserId: existing.userId.toString(),
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })

    return completeLoginForUser(existing.userId.toString(), {
      languageCode: ctx.languageCode,
      clientMeta: ctx.clientMeta,
      nextPath: ctx.nextPath,
    })
  }

  if (existing) {
    return {
      kind: 'redirect',
      url: buildOAuthLoginRedirect({
        oauthError: 'oauth_account_exists',
        variant: 'sign-in',
        nextPath: ctx.nextPath,
      }),
    }
  }

  const email = ctx.profile.email?.trim().toLowerCase() ?? buildInternalOAuthEmail(ctx.provider, ctx.profile.providerUserId)
  const collisionUser = await findUserByEmailForCollision(email)

  if (collisionUser) {
    await logOAuthAttempt({
      provider: ctx.provider,
      providerUserId: ctx.profile.providerUserId,
      providerEmail: ctx.profile.email,
      flow: ctx.flow,
      outcome: 'email_collision',
      collisionUserId: collisionUser._id.toString(),
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })

    return {
      kind: 'redirect',
      url: buildOAuthLoginRedirect({
        oauthError: 'oauth_email_collision',
        variant: 'sign-in',
        nextPath: ctx.nextPath,
      }),
    }
  }

  const user = await createOAuthUser({ email, languageCode: ctx.languageCode })

  await createOAuthAccount({
    userId: user._id.toString(),
    provider: ctx.provider,
    profile: ctx.profile,
    tokens: ctx.tokens,
    scopes: ctx.scopes,
  })

  await logOAuthAttempt({
    provider: ctx.provider,
    providerUserId: ctx.profile.providerUserId,
    providerEmail: ctx.profile.email,
    flow: ctx.flow,
    outcome: 'success',
    actorUserId: user._id.toString(),
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  })

  return completeLoginForUser(user._id.toString(), {
    languageCode: ctx.languageCode,
    clientMeta: ctx.clientMeta,
    nextPath: ctx.nextPath,
  })
}

export async function handleOAuthLinkCallback(
  ctx: OAuthFlowContext & {
    t: TFunction
  },
): Promise<{ url: string }> {
  if (!ctx.actorUserId) {
    throw new ValidationError(ctx.t('auth.oauth.errors.linkSessionExpired'))
  }

  const taken = await findOAuthAccount(ctx.provider, ctx.profile.providerUserId)

  if (taken && taken.userId.toString() !== ctx.actorUserId) {
    await logOAuthAttempt({
      provider: ctx.provider,
      providerUserId: ctx.profile.providerUserId,
      providerEmail: ctx.profile.email,
      flow: 'link',
      outcome: 'provider_taken',
      actorUserId: ctx.actorUserId,
      collisionUserId: taken.userId.toString(),
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })

    return { url: buildProfileRedirect({ oauthError: 'oauth_provider_taken' }) }
  }

  if (taken) {
    await touchOAuthAccount(taken, ctx.profile)

    return { url: buildProfileRedirect({ oauthLinked: ctx.provider }) }
  }

  await createOAuthAccount({
    userId: ctx.actorUserId,
    provider: ctx.provider,
    profile: ctx.profile,
    tokens: ctx.tokens,
    scopes: ctx.scopes,
  })

  await logOAuthAttempt({
    provider: ctx.provider,
    providerUserId: ctx.profile.providerUserId,
    providerEmail: ctx.profile.email,
    flow: 'link',
    outcome: 'success',
    actorUserId: ctx.actorUserId,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  })

  return { url: buildProfileRedirect({ oauthLinked: ctx.provider }) }
}

export function assertOAuthFlow(value: string | null | undefined): OAuthFlow {
  if (value === 'signIn' || value === 'signUp' || value === 'link') {
    return value
  }

  return 'signIn'
}

export function isProviderAllowedForFlow(provider: OAuthProviderId, flow: OAuthFlow): boolean {
  const context = flow === 'link' ? 'link' : flow

  return OAUTH_CONFIG.getProvidersForContext(context).includes(provider)
}
