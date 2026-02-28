'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import React, { Suspense, useCallback, useEffect, useState } from 'react'

import { UserRole } from '~/api/user'
import { SpinnerScreen } from '~/components/Loaders'
import { useAuth } from '~/providers'
import { useNotify } from '~/providers/notify'
import { useLoginMutation, useLogoutQuery, useSignUpMutation } from '~/query/auth'

const SignInBlock = React.lazy(() => import('~/components/Entities/Auth/Blocks/SignInBlock').then((module) => ({ default: module.SignInBlock })))
const SignUpBlock = React.lazy(() => import('~/components/Entities/Auth/Blocks/SignUpBlock').then((module) => ({ default: module.SignUpBlock })))

// Компонент для работы с searchParams
const LoginWithParams = () => {
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('nextPath')
  const searchVariant = searchParams.get('variant')
  const [variant, setVariant] = useState<'sign-in' | 'sign-up'>(searchVariant === 'sign-up' ? 'sign-up' : 'sign-in')
  const { notify } = useNotify()
  const router = useRouter()
  const { refetch, isLoading, isClient } = useAuth()

  const { refetch: refetchLogout, isLoading: isLogoutLoading } = useLogoutQuery(isClient)

  useEffect(() => {
    if (isClient) {
      refetchLogout()
        .catch((error) => {
          console.error(error)
        })
        .catch((error) => {
          console.error(error)
        })
    }
  }, [refetchLogout, isClient])

  const { loginMutation } = useLoginMutation()
  const { signUpMutation } = useSignUpMutation()

  const handleSignIn = async (email: string, password: string) => {
    try {
      const response = await loginMutation.mutateAsync({
        email,
        password,
      })

      if (response.success) {
        const result = await refetch?.()

        if (nextPath) {
          router.replace(nextPath)
        } else {
          if (result?.data?.role === UserRole.ADMIN) {
            router.replace('/admin')
          } else {
            router.replace('/')
          }
        }
      } else {
        console.error('Login failed')
      }
    } catch (error) {
      notify('Sign in failed, please check your data and try again', 'warning')
      console.error(error)
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
        console.error('SignUp failed')
      }
    } catch (error) {
      notify('Sign up failed, please check your data and try again', 'warning')
      console.error(error)
    }
  }

  const handleChange = useCallback(
    (variant: 'sign-in' | 'sign-up') => () => {
      setVariant(variant)
    },
    [],
  )

  // Показываем loading до определения клиентского состояния
  if (!isClient || isLoading || isLogoutLoading) {
    return <SpinnerScreen />
  }

  return (
    <div className="w-full h-full flex items-center justify-center flex-col flex-1 px-4">
      {variant === 'sign-in' && (
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
