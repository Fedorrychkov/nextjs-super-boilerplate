'use client'

import { ACCOUNT_CONFIG } from '@config/env'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { routes } from '~/constants'
import { isOnboardingModalSeen, markOnboardingModalSeen } from '~/lib/onboarding/modal-storage'
import { useAuth } from '~/providers'
import { useOnboardingMutation, useOnboardingQuery } from '~/query/account'

import { OnboardingModal } from './OnboardingModal'

const SKIP_PATHS = new Set([routes.login.path, routes.logout.path, routes.refresh.path])

export const OnboardingModalHost = () => {
  const pathname = usePathname()
  const { authUser, isLoading, isClient } = useAuth()
  const enabled = ACCOUNT_CONFIG.publicOnboardingEnabled && Boolean(authUser) && isClient && !SKIP_PATHS.has(pathname)
  const { data, isLoading: onboardingLoading } = useOnboardingQuery(enabled)
  const { completeStepMutation } = useOnboardingMutation()
  const [open, setOpen] = useState(false)
  const openedRef = useRef(false)

  useEffect(() => {
    if (!enabled || isLoading || onboardingLoading || !data?.enabled) {
      return
    }

    if (data.dismissed || data.complete || isOnboardingModalSeen(data.version)) {
      return
    }

    if (openedRef.current) {
      return
    }

    openedRef.current = true
    queueMicrotask(() => {
      setOpen(true)
    })

    if (!data.steps.find((step) => step.id === 'profile')?.completed) {
      void completeStepMutation.mutateAsync('profile')
    }
  }, [completeStepMutation, data, enabled, isLoading, onboardingLoading])

  const handleClose = () => {
    if (data?.version != null) {
      markOnboardingModalSeen(data.version)
    }

    setOpen(false)
  }

  if (!data?.enabled) {
    return null
  }

  return <OnboardingModal open={open} onClose={handleClose} state={data} />
}
