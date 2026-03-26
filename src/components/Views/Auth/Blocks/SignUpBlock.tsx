'use client'

import { Lock, Mail, UserRoundPlusIcon } from 'lucide-react'
import * as React from 'react'
import { useState } from 'react'

import { Button } from '~/components/ui'
import { useT } from '~/providers'

type Props = {
  onSubmit: (email: string, password: string) => void
  isLoading: boolean
  onChange: () => void
}

const SignUpBlock = (props: Props) => {
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handle = (e: React.FormEvent<HTMLFormElement>) => {
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
    <div className="min-h-screen w-full flex items-center justify-center bg-white rounded-xl z-1">
      <form
        onSubmit={handle}
        className="w-full max-w-sm bg-gradient-to-b from-sky-50/50 to-white  rounded-3xl shadow-xl shadow-opacity-10 p-8 flex flex-col items-center border border-blue-100 text-black"
      >
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white mb-6 shadow-lg shadow-opacity-5">
          <UserRoundPlusIcon className="w-7 h-7 text-black" />
        </div>
        <h2 className="text-2xl font-semibold mb-2 text-center">{t('auth.ui.createAccountToContinue')}</h2>
        <p className="text-gray-500 text-sm mb-6 text-center">
          {t('auth.ui.pleaseEnterYourEmailAndPasswordToCreateAnAccountYouWillBeAbleToSignInUsingTheseCredentialsInTheFuture')}
        </p>
        <div className="w-full flex flex-col gap-3 mb-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Mail className="w-4 h-4" />
            </span>
            <input
              placeholder={t('auth.ui.email')}
              type="email"
              value={email}
              disabled={props.isLoading}
              className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-gray-50 text-black text-sm"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Lock className="w-4 h-4" />
            </span>
            <input
              placeholder={t('auth.ui.password')}
              type="password"
              value={password}
              disabled={props.isLoading}
              className="w-full pl-10 pr-10 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-gray-50 text-black text-sm"
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer text-xs select-none"></span>
          </div>

          <div className="w-full flex justify-end">{error && <div className="text-sm text-red-500 text-left">{error}</div>}</div>
        </div>
        <button
          type="submit"
          disabled={props.isLoading}
          className="w-full bg-gradient-to-b from-gray-700 to-gray-900 text-white font-medium py-2 rounded-xl shadow hover:brightness-105 cursor-pointer transition mb-4 mt-2"
        >
          {t('auth.ui.createAccount')}
        </button>
        <Button variant="link" onClick={props.onChange}>
          {t('auth.ui.signIn')}
        </Button>
      </form>
    </div>
  )
}

export { SignUpBlock }
