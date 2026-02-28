import React from 'react'

export type NotifyType = 'success' | 'warning' | 'info' | 'secondary' | 'primary' | 'destructive' | 'mono' | null | undefined

export type NotifyContextType = {
  notify: (
    message: React.ReactNode,
    type: NotifyType,
    options?: {
      delay?: number
      closable?: boolean
    },
  ) => void
}
