'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { AlertBlock } from '~/components/ui'
import { cn } from '~/utils/cn'
import { logger } from '~/utils/logger'

import { NotifyType } from './types'
import { NotifyContext } from './useNotify'

export const NotifyProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifies, setNotifies] = useState<{ message: React.ReactNode; type: NotifyType; id: number; delay: number; closable: boolean }[] | null>(null)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const [soundEnabled] = useState<boolean>(true)
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(false)

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

      if (audioRef.current) {
        audioRef.current.currentTime = 0
        audioRef.current.play().catch((e) => logger.error('Audio play failed:', e))
      }

      setNotifies((prev) => [...(prev ?? []), { message, type, id: Date.now(), delay, closable }])
    },
    [],
  )

  // Handler of messages from Service Worker for sound playback
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_RECEIVED') {
        logger.info('[App] Received notification from SW:', event.data.payload, { documentVisibilityState: document.visibilityState })

        if (document.visibilityState === 'hidden' && audioRef.current) {
          try {
            audioRef.current.currentTime = 0
            audioRef.current.play().catch((e) => logger.error('Audio play failed:', e))
          } catch (e) {
            logger.error('Audio error:', e)
          }
        }

        if (document.visibilityState === 'visible') {
          handleNotify(event.data.payload.body, 'info')
        }
      }
    }

    navigator.serviceWorker?.addEventListener('message', handleMessage)

    return () => navigator.serviceWorker?.removeEventListener('message', handleMessage)
  }, [handleNotify])

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

  // Function to unlock audio through user interaction
  const unlockAudio = useCallback(async () => {
    if (audioRef.current && !audioUnlocked) {
      try {
        await audioRef.current.play()
        setAudioUnlocked(true)
        logger.info('[App] Audio unlocked successfully')
      } catch (error) {
        logger.error('[App] Audio unlock failed:', error)
      }
    }
  }, [audioUnlocked])

  const values = useMemo(() => {
    return {
      notify: handleNotify,
      unlockAudio,
      audioUnlocked,
      soundEnabled,
    }
  }, [handleNotify, unlockAudio, audioUnlocked, soundEnabled])

  return (
    <NotifyContext.Provider value={values}>
      {children}
      <div
        className={cn('fixed left-0 bottom-0 max-w-[600px] flex flex-col gap-6 p-10', {
          'z-[1000]': notifies && notifies?.length > 0,
        })}
      >
        <audio ref={audioRef} src="/notify.mp3" preload="auto" style={{ display: 'none' }} />
        {notifies?.map((notify) => (
          <AlertBlock notify={notify} onClose={handleClose} key={notify.id} />
        ))}
      </div>
    </NotifyContext.Provider>
  )
}
