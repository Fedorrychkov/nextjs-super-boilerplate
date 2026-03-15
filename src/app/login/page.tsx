'use client'

import { AxiosError } from 'axios'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { Suspense, useCallback, useEffect, useState } from 'react'

import { SpinnerScreen } from '~/components/Loaders'
import { useAuth } from '~/providers'
import { useNotify } from '~/providers/notify'
import { useLoginMfaMutation, useLoginMutation, useLogoutQuery, useSignUpMutation } from '~/query/auth'
import { Logger } from '~/utils/logger'
import { time } from '~/utils/time'

const logger = new Logger(['LoginWithParams', '[src/app/login/page.tsx]'])

const SignInBlock = React.lazy(() => import('~/components/Views/Auth/Blocks/SignInBlock').then((module) => ({ default: module.SignInBlock })))
const SignUpBlock = React.lazy(() => import('~/components/Views/Auth/Blocks/SignUpBlock').then((module) => ({ default: module.SignUpBlock })))
const MfaCodeBlock = React.lazy(() => import('~/components/Views/Auth/Blocks/MfaCodeBlock').then((module) => ({ default: module.MfaCodeBlock })))

// Component for handling searchParams
const LoginWithParams = () => {
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('nextPath')
  const searchVariant = searchParams.get('variant')
  const [variant, setVariant] = useState<'sign-in' | 'sign-up'>(searchVariant === 'sign-up' ? 'sign-up' : 'sign-in')
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

  const { loginMutation } = useLoginMutation()
  const { loginMfaMutation } = useLoginMfaMutation()
  const { signUpMutation } = useSignUpMutation()

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
      if (error instanceof AxiosError) {
        const after = error.response?.data?.retryAfterSeconds

        if (after) {
          const duration = time().add(after, 'seconds')

          notify(`Too many login attempts. Please try again after ${after ? `${duration.format('HH:mm:ss')}.` : 'later.'}`, 'destructive')

          return
        }
      }

      notify('Sign in failed, please check your data and try again', 'warning')

      logger.error(error)
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
      notify('Invalid code. Try again or use a backup code.', 'destructive')
      logger.error(error)
    }
  }

  const handleSignUp = async (email: string, password: string) => {
    try {
      const response = await signUpMutation.mutateAsync({
        email,
        password,
      })

      if (response.success) {
        if (nextPath) {
          router.replace(nextPath)
        } else {
          router.replace('/')
        }
      } else {
        logger.error('SignUp failed')
      }
    } catch (error) {
      notify('Sign up failed, please check your data and try again', 'warning')
      logger.error(error)
    }
  }

  const handleChange = useCallback(
    (variant: 'sign-in' | 'sign-up') => () => {
      setVariant(variant)
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
          <SignInBlock isLoading={loginMutation.isLoading || isLoading} onSubmit={handleSignIn} onChange={handleChange('sign-up')} />
        </Suspense>
      )}

      {variant === 'sign-up' && (
        <Suspense fallback={<SpinnerScreen />}>
          <SignUpBlock
            isLoading={signUpMutation.isLoading || loginMutation.isLoading || isLoading}
            onSubmit={handleSignUp}
            onChange={handleChange('sign-in')}
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
