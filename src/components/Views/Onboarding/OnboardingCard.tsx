'use client'

import { ACCOUNT_CONFIG } from '@config/env'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

import type { OnboardingStepStateModel } from '~/api/account/client'
import { Button, Typography } from '~/components/ui'
import { markOnboardingModalSeen } from '~/lib/onboarding/modal-storage'
import { useT } from '~/providers'
import { useOnboardingMutation, useOnboardingQuery } from '~/query/account'

/** Maps a step to the profile tab + anchor it should navigate to. */
const STEP_TARGET: Record<OnboardingStepStateModel['id'], { tab: string; anchor: string } | null> = {
  profile: null,
  mfa: { tab: 'security', anchor: 'profile-mfa' },
  push: { tab: 'devices', anchor: 'profile-push' },
}

/** Retry scrolling to an anchor until the lazily-mounted tab renders it (or we give up). */
const scrollToAnchorWhenReady = (anchor: string) => {
  let attempts = 0

  const tick = () => {
    const el = document.getElementById(anchor)

    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })

      return
    }

    if (attempts++ < 40) {
      requestAnimationFrame(tick)
    }
  }

  requestAnimationFrame(tick)
}

export const OnboardingCard = () => {
  const t = useT()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data, refetch } = useOnboardingQuery(ACCOUNT_CONFIG.publicOnboardingEnabled)
  const { completeStepMutation, dismissMutation } = useOnboardingMutation()

  useEffect(() => {
    if (!ACCOUNT_CONFIG.publicOnboardingEnabled || !data?.enabled || data.steps.find((s) => s.id === 'profile')?.completed) {
      return
    }

    void completeStepMutation.mutateAsync('profile').then(() => refetch())
  }, [completeStepMutation, data?.enabled, data?.steps, refetch])

  if (!ACCOUNT_CONFIG.publicOnboardingEnabled || !data?.enabled || data.dismissed) {
    return null
  }

  const navigateToStep = (target: { tab: string; anchor: string }) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('activeTab', target.tab)
    router.replace(`${pathname}?${params.toString()}`)
    scrollToAnchorWhenReady(target.anchor)
  }

  const handleDismiss = async () => {
    await dismissMutation.mutateAsync()
    markOnboardingModalSeen(data.version)
    await refetch()
  }

  return (
    <div className="flex flex-col rounded-lg border bg-card p-4 space-y-4">
      <Typography variant="heading-3">{t('onboarding.title')}</Typography>
      <Typography variant="Body/S/Regular">{t('onboarding.description')}</Typography>
      <div className="flex flex-col gap-2">
        {data.steps.map((step) => {
          const target = STEP_TARGET[step.id]

          return (
            <div key={step.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
              <div className="flex flex-col gap-1">
                <Typography variant="Body/S/Semibold">{t(`onboarding.steps.${step.id}.title`)}</Typography>
                <Typography variant="Body/XS/Regular" className="text-muted-foreground">
                  {t(`onboarding.steps.${step.id}.description`)}
                </Typography>
              </div>
              {step.completed ? (
                <Typography variant="Body/XS/Semibold" className="text-primary">
                  {t('onboarding.done')}
                </Typography>
              ) : target ? (
                <Button variant="outline" size="sm-md" onClick={() => navigateToStep(target)}>
                  {t('onboarding.openSection')}
                </Button>
              ) : null}
            </div>
          )
        })}
      </div>
      <Button variant="ghost" disabled={dismissMutation.isLoading} onClick={handleDismiss}>
        {t('onboarding.dismiss')}
      </Button>
    </div>
  )
}
