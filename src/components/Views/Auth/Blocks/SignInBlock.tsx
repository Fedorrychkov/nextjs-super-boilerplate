'use client'

import { Eye, EyeOff, Lock, LogIn, Mail } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'
import { useState } from 'react'

import { InputField } from '~/components/Fields'
import { Button, Typography } from '~/components/ui'
import { OAuthDivider, OAuthProviderButtons } from '~/components/Views/Auth/OAuthProviderButtons'
import { useSwitch } from '~/hooks/useSwitch'
import { getPublicOAuthConfig } from '~/lib/auth/oauth-public-config'
import { useT } from '~/providers'

type Props = {
  onSubmit: (email: string, password: string) => void
  isLoading: boolean
  onChange?: () => void
  nextPath?: string | null
}

const SignInBlock = (props: Props) => {
  const t = useT()
  const oauthConfig = getPublicOAuthConfig()
  const oauthFirst = oauthConfig.uiMode === 'oauth_first'
  const credentialsOnly = oauthConfig.uiMode === 'credentials_only'
  const oauthOnly = oauthConfig.uiMode === 'oauth_only'
  const [isPasswordVisible, { toggle: togglePasswordVisibility }] = useSwitch(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleSignIn = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!email || !password) {
      setError(t('auth.errors.enterEmailAndPassword'))

      return
    }

    if (!validateEmail(email)) {
      setError(t('auth.errors.enterValidEmail'))

      return
    }
    setError('')

    props.onSubmit(email, password)
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-transparent rounded-xl z-1">
      <form
        onSubmit={handleSignIn}
        className="w-full max-w-sm bg-gradient-to-b from-sky-50/50 to-background dark:from-sky-900/50 rounded-3xl shadow-xl shadow-opacity-10 dark:shadow-sky-900/50 p-8 flex flex-col items-center border border-blue-100 dark:border-background text-foreground"
      >
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-background mb-6 shadow-lg shadow-opacity-5">
          <LogIn className="w-7 h-7 text-foreground" />
        </div>
        <Typography variant="Body/L/Semibold" asTag="h2" className="mb-2 text-center">
          {t('auth.ui.signInWithEmail')}
        </Typography>
        <Typography variant="Body/M/Regular" asTag="p" className="text-sm mb-6 text-center text-muted-foreground">
          {t('auth.ui.signInToContinueWorking')}
        </Typography>

        {oauthFirst && !credentialsOnly ? <OAuthProviderButtons flow="signIn" nextPath={props.nextPath} disabled={props.isLoading} /> : null}
        {oauthFirst && !credentialsOnly ? <OAuthDivider flow="signIn" /> : null}

        {!oauthOnly ? (
          <div className="w-full flex flex-col gap-3 mb-2">
            <div className="relative">
              <InputField
                placeholder={t('auth.ui.email')}
                type="email"
                name="email"
                value={email}
                disabled={props.isLoading}
                additionalLeftComponent={
                  <Typography asTag="span" className="ml-3 text-gray-400">
                    <Mail className="w-4 h-4" />
                  </Typography>
                }
                classNames={{
                  input: 'w-full pl-10 pr-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm',
                }}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <InputField
                placeholder={t('auth.ui.password')}
                type={isPasswordVisible ? 'text' : 'password'}
                name="password"
                value={password}
                additionalLeftComponent={
                  <Typography asTag="span" className="ml-3 text-gray-400">
                    <Lock className="w-4 h-4" />
                  </Typography>
                }
                additionalRightComponent={
                  <Button type="button" size="input-icon" variant="ghost" className="text-gray-400 mr-3 cursor-pointer" onClick={togglePasswordVisibility}>
                    {isPasswordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                }
                disabled={props.isLoading}
                classNames={{
                  input: 'w-full pl-10 pr-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm',
                }}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Typography asTag="span" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer text-xs select-none"></Typography>
            </div>
            <div className="w-full flex justify-end">{error && <div className="text-sm text-red-500 text-left">{error}</div>}</div>
            <div className="w-full flex justify-end">
              <Link href="/forgot-password" className="text-xs text-primary underline">
                {t('auth.password.forgotLink')}
              </Link>
            </div>
          </div>
        ) : null}

        {!oauthOnly ? (
          <button
            type="submit"
            disabled={props.isLoading}
            className="w-full bg-gradient-to-b from-gray-700 to-gray-900 text-white dark:from-gray-700 dark:to-gray-900 dark:text-foreground dark:hover:text-foreground font-medium py-2 rounded-xl shadow hover:brightness-105 cursor-pointer transition mb-4 mt-2"
          >
            {t('auth.ui.signIn')}
          </button>
        ) : null}

        {!oauthFirst && !credentialsOnly ? <OAuthDivider flow="signIn" /> : null}
        {!oauthFirst && !credentialsOnly ? <OAuthProviderButtons flow="signIn" nextPath={props.nextPath} disabled={props.isLoading} /> : null}

        {props.onChange ? (
          <Button variant="ghost" className="w-full mt-2" onClick={props.onChange}>
            {t('auth.ui.signUp')}
          </Button>
        ) : null}
      </form>
    </div>
  )
}

export { SignInBlock }
