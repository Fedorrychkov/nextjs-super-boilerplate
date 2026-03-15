'use client'

import { KeyRound } from 'lucide-react'
import * as React from 'react'

import { Button } from '~/components/ui'

type Props = {
  onSubmit: (code: string) => void
  onBack: () => void
  isLoading: boolean
}

const MfaCodeBlock = (props: Props) => {
  const [code, setCode] = React.useState('')
  const [error, setError] = React.useState('')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = code.replace(/\D/g, '')

    if (!trimmed) {
      setError('Enter the code from your app')

      return
    }
    setError('')
    props.onSubmit(trimmed)
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white rounded-xl z-1">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-gradient-to-b from-sky-50/50 to-white rounded-3xl shadow-xl shadow-opacity-10 p-8 flex flex-col items-center border border-blue-100 text-black"
      >
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white mb-6 shadow-lg shadow-opacity-5">
          <KeyRound className="w-7 h-7 text-black" />
        </div>
        <h2 className="text-2xl font-semibold mb-2 text-center">Two-factor authentication</h2>
        <p className="text-gray-500 text-sm mb-6 text-center">Enter the 6-digit code from your authenticator app, or a backup code.</p>
        <div className="w-full flex flex-col gap-3 mb-4">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000 or backup code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={props.isLoading}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-gray-50 text-black text-center text-lg tracking-widest font-mono"
          />
          {error && <p className="text-sm text-red-500 text-left">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={props.isLoading}
          className="w-full bg-gradient-to-b from-gray-700 to-gray-900 text-white font-medium py-2 rounded-xl shadow hover:brightness-105 cursor-pointer transition mb-4 mt-2"
        >
          {props.isLoading ? 'Checking…' : 'Continue'}
        </button>
        <Button type="button" variant="link" onClick={props.onBack}>
          Back to sign in
        </Button>
      </form>
    </div>
  )
}

export { MfaCodeBlock }
