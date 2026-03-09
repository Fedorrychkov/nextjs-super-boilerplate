'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { ClientSubscriptionApi } from '~/api/subscription'

type PushPermission = NotificationPermission | 'unsupported'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

export const usePush = (params?: { publicVapidKey?: string; getUserId?: () => string | undefined }) => {
  const [permission, setPermission] = useState<PushPermission>('unsupported')
  const [subscribed, setSubscribed] = useState<boolean>(false)
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window

    if (!supported) {
      setPermission('unsupported')

      return
    }

    setPermission(Notification.permission)
  }, [])

  // Synchronize subscription status when mounting
  useEffect(() => {
    ;(async () => {
      const reg = registrationRef.current || (await register())

      if (!reg) {
        setSubscribed(false)

        return
      }

      const existing = await reg.pushManager.getSubscription()

      if (!existing) {
        setSubscribed(false)

        return
      }

      try {
        const api = new ClientSubscriptionApi()
        const res = await api.status({ endpoint: existing.endpoint })

        setSubscribed(!!res?.subscribed)
      } catch {
        // if the backend is not available - consider it by the local fact
        setSubscribed(true)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const register = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return null
    const reg = await navigator.serviceWorker.register('/sw.js')
    registrationRef.current = reg

    return reg
  }, [])

  const askPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported' as PushPermission
    const perm = await Notification.requestPermission()
    setPermission(perm)

    return perm
  }, [])

  const subscribe = useCallback(async () => {
    if (!registrationRef.current) await register()
    const reg = registrationRef.current!

    if (permission !== 'granted') {
      const perm = await askPermission()

      if (perm !== 'granted') return null
    }

    const existing = await reg.pushManager.getSubscription()

    if (existing) {
      setSubscribed(true)

      return existing
    }

    // Public VAPID key is required for Chrome/Firefox
    const rawPublicKey = params?.publicVapidKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

    if (!rawPublicKey) {
      throw new Error('Missing VAPID public key. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY in env or pass publicVapidKey param')
    }
    const applicationServerKey = urlBase64ToUint8Array(rawPublicKey)

    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })

    const api = new ClientSubscriptionApi()

    await api.subscribe({ subscription: sub })

    setSubscribed(true)

    return sub
  }, [askPermission, permission, register, params])

  const unsubscribe = useCallback(async () => {
    const api = new ClientSubscriptionApi()
    const reg = registrationRef.current || (await register())

    if (!reg) return

    const sub = await reg.pushManager.getSubscription()

    if (!sub) return
    const endpoint = sub.endpoint
    await sub.unsubscribe()
    await api.unsubscribe({ endpoint })

    setSubscribed(false)
  }, [register])

  return { permission, subscribed, register, askPermission, subscribe, unsubscribe }
}
