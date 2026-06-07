'use client'

import { ACCOUNT_CONFIG } from '@config/env'
import { useEffect } from 'react'

import type { OnboardingStepStateModel } from '~/api/account/client'
import { Button, Typography } from '~/components/ui'
import { markOnboardingModalSeen } from '~/lib/onboarding/modal-storage'
import { useT } from '~/providers'
import { useOnboardingMutation, useOnboardingQuery } from '~/query/account'

const SECTION_ID: Record<OnboardingStepStateModel['id'], string | null> = {
  profile: null,
  mfa: 'profile-mfa',
  push: 'profile-notifications',
}

export const OnboardingCard = () => {
  const t = useT()
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

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
        {data.steps.map((step) => (
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
            ) : SECTION_ID[step.id] ? (
              <Button variant="outline" size="sm-md" onClick={() => scrollToSection(SECTION_ID[step.id]!)}>
                {t('onboarding.setupBelow')}
              </Button>
            ) : null}
          </div>
        ))}
      </div>
      <Button variant="ghost" disabled={dismissMutation.isLoading} onClick={handleDismiss}>
        {t('onboarding.dismiss')}
      </Button>
    </div>
  )
}
