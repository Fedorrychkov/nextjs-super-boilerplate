'use client'

import { useContext } from 'react'

import { AnchorScrollContext } from './context'

export const useAnchorScroll = () => {
  const ctx = useContext(AnchorScrollContext)

  if (!ctx) throw new Error('useAnchorScroll must be used within AnchorScrollProvider')

  return ctx
}
