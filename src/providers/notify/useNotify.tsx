'use client'

import { createContext, useContext } from 'react'

import { NotifyContextType } from './types'

export const NotifyContext = createContext<NotifyContextType>({
  notify: () => {},
})

export const useNotify = () => {
  const context = useContext(NotifyContext)

  if (!context) throw new Error('useNotifyContext must be used within a NotifyProvider')

  return context
}
