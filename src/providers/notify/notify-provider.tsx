'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { AlertBlock } from '~/components/ui'
import { cn } from '~/utils/cn'

import { NotifyType } from './types'
import { NotifyContext } from './useNotify'

export const NotifyProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifies, setNotifies] = useState<{ message: React.ReactNode; type: NotifyType; id: number; delay: number; closable: boolean }[] | null>(null)

  const handleNotify = useCallback(
    (
      message: React.ReactNode,
      type: NotifyType,
      options?: {
        delay?: number
        closable?: boolean
      },
    ) => {
      const { delay = 3000, closable = true } = options ?? {}

      setNotifies((prev) => [...(prev ?? []), { message, type, id: Date.now(), delay, closable }])
    },
    [],
  )

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (notifies && notifies.length > 0) {
      interval = setInterval(() => {
        const currentTime = Date.now()

        const filteredNotifies = notifies.filter((notify) => currentTime - notify.id < notify.delay)

        setNotifies(filteredNotifies)
      }, 1000)

      return () => {
        if (interval) {
          clearInterval(interval)
        }
      }
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [notifies])

  const handleClose = useCallback((id?: number) => {
    setNotifies((prev) => prev?.filter((notify) => notify.id !== id) ?? [])
  }, [])

  const values = useMemo(() => {
    return {
      notify: handleNotify,
    }
  }, [handleNotify])

  return (
    <NotifyContext.Provider value={values}>
      {children}
      <div
        className={cn('fixed left-0 bottom-0 max-w-[600px] flex flex-col gap-6 p-10', {
          'z-[1000]': notifies && notifies?.length > 0,
        })}
      >
        {notifies?.map((notify) => (
          <AlertBlock notify={notify} onClose={handleClose} key={notify.id} />
        ))}
      </div>
    </NotifyContext.Provider>
  )
}
