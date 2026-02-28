'use client'

import { createContext, useContext } from 'react'

import { AuthContextType } from './types'

export const AuthUserContext = createContext<AuthContextType>({
  authUser: null,
  isLoading: true,
  isAdmin: false,
  role: null,
  isFetched: false,
  isClient: false,
})

export const useAuth = () => {
  const context = useContext(AuthUserContext)

  if (!context) throw new Error('useAuthContext must be used within a AuthProvider')

  return context
}
