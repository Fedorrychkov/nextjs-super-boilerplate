'use client'

import { AxiosError } from 'axios'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { Suspense, useCallback, useEffect, useState } from 'react'

import { SpinnerScreen } from '~/components/Loaders'
import type { AppMessageKey } from '~/lib/i18n/types'
import { useAuth, useT } from '~/providers'
import { useNotify } from '~/providers/notify'
import { useLoginMfaMutation, useLoginMutation, useLogoutQuery, useSignUpMutation } from '~/query/auth'
import { Logger } from '~/utils/logger'
import { time } from '~/utils/time'

const logger = new Logger(['LoginWithParams', '[src/app/login/page.tsx]'])

const SignInBlock = React.lazy(() => import('~/components/Views/Auth/Blocks/SignInBlock').then((module) => ({ default: module.SignInBlock })))
const SignUpBlock = React.lazy(() => import('~/components/Views/Auth/Blocks/SignUpBlock').then((module) => ({ default: module.SignUpBlock })))
const SignUpVerifyBlock = React.lazy(() => import('~/components/Views/Auth/Blocks/SignUpVerifyBlock').then((module) => ({ default: module.SignUpVerifyBlock })))
const MfaCodeBlock = React.lazy(() => import('~/components/Views/Auth/Blocks/MfaCodeBlock').then((module) => ({ default: module.MfaCodeBlock })))

function postAuthRedirectPath(nextPath: string | null): string {
  return nextPath || '/'
}

// Component for handling searchParams
const LoginWithParams = () => {
  const t = useT()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('nextPath')
  const searchVariant = searchParams.get('variant')
  const oauthError = searchParams.get('oauthError')
  const oauthMfaChallenge = searchParams.get('oauthMfaChallenge')
  const [variant, setVariant] = useState<'sign-in' | 'sign-up'>(searchVariant === 'sign-up' ? 'sign-up' : 'sign-in')
  const [signUpStep, setSignUpStep] = useState<'credentials' | 'verify'>('credentials')
  const [signUpEmail, setSignUpEmail] = useState('')
  const [loginStep, setLoginStep] = useState<'credentials' | 'mfa'>('credentials')
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null)
  const { notify } = useNotify()
  const router = useRouter()
  const { refetch, isLoading, isClient } = useAuth()

  const { refetch: refetchLogout, isLoading: isLogoutLoading } = useLogoutQuery(isClient)

  useEffect(() => {
    if (isClient) {
      refetchLogout()
        .catch((error) => {
          logger.error(error)
        })
        .catch((error) => {
          logger.error(error)
        })
    }
  }, [refetchLogout, isClient])

  useEffect(() => {
    if (oauthMfaChallenge) {
      queueMicrotask(() => {
        setMfaChallengeId(oauthMfaChallenge)
        setLoginStep('mfa')
        setVariant('sign-in')
      })
    }
  }, [oauthMfaChallenge])

  useEffect(() => {
    if (!oauthError) return

    const map: Record<string, AppMessageKey> = {
      oauth_account_not_found: 'auth.oauth.errors.accountNotFound',
      oauth_email_collision: 'auth.oauth.errors.emailCollision',
      oauth_account_exists: 'auth.oauth.errors.accountExists',
      oauth_provider_error: 'auth.oauth.errors.providerError',
    }

    notify(t(map[oauthError] ?? 'auth.oauth.errors.unknown'), 'destructive')
  }, [oauthError, notify, t])

  const { loginMutation } = useLoginMutation()
  const { loginMfaMutation } = useLoginMfaMutation()
  const { signUpRequestMutation, signUpCompleteMutation } = useSignUpMutation()

  const handleSignIn = async (email: string, password: string) => {
    try {
      const response = await loginMutation.mutateAsync({
        email,
        password,
      })

      if (response.success && 'requiresMfa' in response && response.requiresMfa && response.challengeId) {
        setMfaChallengeId(response.challengeId)
        setLoginStep('mfa')

        return
      }

      if (response.success && 'user' in response) {
        await refetch?.()

        if (nextPath) {
          router.replace(nextPath)
        } else {
          router.replace('/')
        }
      } else {
        logger.error('Login failed')
      }
    } catch (error) {
      logger.error(error)

      if (error instanceof AxiosError) {
        const after = error.response?.data?.retryAfterSeconds

        if (after) {
          const duration = time().add(after, 'seconds')

          notify(`${t('auth.errors.tooManyLoginAttempts')} ${after ? `${duration.format('HH:mm:ss')}.` : `${t('auth.errors.later')}.`}`, 'destructive')

          return
        } else {
          notify(error?.response?.data?.message ?? t('auth.errors.signInFailed'), 'warning')
        }
      } else {
        notify(t('auth.errors.signInFailed'), 'warning')
      }
    }
  }

  const handleMfaSubmit = async (code: string) => {
    if (!mfaChallengeId) return
    try {
      const response = await loginMfaMutation.mutateAsync({ challengeId: mfaChallengeId, code })

      if (response.success) {
        await refetch?.()
        setLoginStep('credentials')
        setMfaChallengeId(null)

        if (nextPath) {
          router.replace(nextPath)
        } else {
          router.replace('/')
        }
      }
    } catch (error) {
      notify(t('auth.errors.invalidCode'), 'destructive')
      logger.error(error)
    }
  }

  const handleSignUpRequest = async (email: string, password: string) => {
    try {
      const response = await signUpRequestMutation.mutateAsync({ email, password })

      if (response.success && response.nextStep === 'logged_in' && 'user' in response) {
        await refetch?.()

        router.replace(postAuthRedirectPath(nextPath))

        return
      }

      if (response.success && response.nextStep === 'verify') {
        setSignUpEmail(email)
        setSignUpStep('verify')
        const base = response.message ?? t('auth.messages.signUpCodeSent')
        const withDev = 'devCode' in response && response.devCode ? `${base} (dev: ${response.devCode})` : base

        notify(withDev, 'success')
      }
    } catch (error) {
      logger.error(error)

      if (error instanceof AxiosError) {
        const afterSec = error.response?.data?.retryAfterSeconds ?? error.response?.data?.retryAfterSec

        if (error.response?.status === 429 && afterSec) {
          const duration = time().add(Number(afterSec), 'seconds')

          notify(t('auth.errors.signUpTooManyAttempts', { after: duration.format('HH:mm:ss') }), 'destructive')

          return
        }

        if (afterSec) {
          const duration = time().add(Number(afterSec), 'seconds')

          notify(`${error.response?.data?.message ?? t('auth.errors.signUpFailed')} ${duration.format('HH:mm:ss')}.`, 'warning')

          return
        }

        notify(error.response?.data?.message ?? t('auth.errors.signUpFailed'), 'warning')

        return
      }

      notify(t('auth.errors.signUpFailed'), 'warning')
    }
  }

  const handleSignUpComplete = async (code: string) => {
    try {
      const response = await signUpCompleteMutation.mutateAsync({ email: signUpEmail, code })

      if (response.success) {
        await refetch?.()
        setSignUpStep('credentials')
        setSignUpEmail('')

        router.replace(postAuthRedirectPath(nextPath))
      }
    } catch (error) {
      logger.error(error)

      if (error instanceof AxiosError) {
        const afterSec = error.response?.data?.retryAfterSeconds ?? error.response?.data?.retryAfterSec

        if (error.response?.status === 429 && afterSec) {
          const duration = time().add(Number(afterSec), 'seconds')

          notify(t('auth.errors.signUpTooManyAttempts', { after: duration.format('HH:mm:ss') }), 'destructive')

          return
        }

        if (afterSec) {
          const duration = time().add(Number(afterSec), 'seconds')

          notify(`${error.response?.data?.message ?? t('auth.errors.signUpFailed')} ${duration.format('HH:mm:ss')}.`, 'warning')

          return
        }

        notify(error.response?.data?.message ?? t('auth.errors.signUpFailed'), 'warning')

        return
      }

      notify(t('auth.errors.signUpFailed'), 'warning')
    }
  }

  const handleChange = useCallback(
    (next: 'sign-in' | 'sign-up') => () => {
      setVariant(next)

      if (next === 'sign-in') {
        setSignUpStep('credentials')
        setSignUpEmail('')
      }
    },
    [],
  )

  // Show loading until client state is determined
  if (!isClient || isLoading || isLogoutLoading) {
    return <SpinnerScreen />
  }

  return (
    <div className="w-full h-full flex items-center justify-center flex-col flex-1 px-4">
      {variant === 'sign-in' && loginStep === 'mfa' && (
        <Suspense fallback={<SpinnerScreen />}>
          <MfaCodeBlock
            onSubmit={handleMfaSubmit}
            onBack={() => {
              setLoginStep('credentials')
              setMfaChallengeId(null)
            }}
            isLoading={loginMfaMutation.isLoading}
          />
        </Suspense>
      )}

      {variant === 'sign-in' && loginStep === 'credentials' && (
        <Suspense fallback={<SpinnerScreen />}>
          <SignInBlock isLoading={loginMutation.isLoading || isLoading} onSubmit={handleSignIn} onChange={handleChange('sign-up')} nextPath={nextPath} />
        </Suspense>
      )}

      {variant === 'sign-up' && signUpStep === 'credentials' && (
        <Suspense fallback={<SpinnerScreen />}>
          <SignUpBlock
            isLoading={signUpRequestMutation.isLoading || loginMutation.isLoading || isLoading}
            onSubmit={handleSignUpRequest}
            onChange={handleChange('sign-in')}
            nextPath={nextPath}
          />
        </Suspense>
      )}

      {variant === 'sign-up' && signUpStep === 'verify' && (
        <Suspense fallback={<SpinnerScreen />}>
          <SignUpVerifyBlock
            email={signUpEmail}
            isLoading={signUpCompleteMutation.isLoading || loginMutation.isLoading || isLoading}
            onSubmit={handleSignUpComplete}
            onBack={() => {
              setSignUpStep('credentials')
              setSignUpEmail('')
            }}
          />
        </Suspense>
      )}
    </div>
  )
}

const Login = () => {
  return (
    <div className="w-full h-full flex items-center justify-center flex-col flex-1">
      <Suspense fallback={<SpinnerScreen />}>
        <LoginWithParams />
      </Suspense>
    </div>
  )
}

export default Login
