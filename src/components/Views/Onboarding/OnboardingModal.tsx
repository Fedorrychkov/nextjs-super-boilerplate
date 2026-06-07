'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import type { OnboardingStateModel, OnboardingStepStateModel } from '~/api/account/client'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Typography } from '~/components/ui'
import { IosPwaHint } from '~/components/Views/Push/IosPwaHint'
import { useT } from '~/providers'
import { useNotify } from '~/providers/notify'
import { usePush } from '~/providers/push'
import { useOnboardingMutation } from '~/query/account'

const MFA_SECTION_ID = 'profile-mfa'
const PUSH_SECTION_ID = 'profile-notifications'

type OnboardingModalProps = {
  open: boolean
  onClose: () => void
  state: OnboardingStateModel
}

export const OnboardingModal = ({ open, onClose, state }: OnboardingModalProps) => {
  const t = useT()
  const router = useRouter()
  const { notify, unlockAudio } = useNotify()
  const { subscribed, subscribe, unsubscribe, permission } = usePush()
  const { completeStepMutation } = useOnboardingMutation()
  const steps = state.steps
  const [stepIndex, setStepIndex] = useState(0)

  const activeStep = steps[stepIndex]
  const isLastStep = stepIndex >= steps.length - 1

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setStepIndex(0)
      })
    }
  }, [open])

  const handlePushToggle = async () => {
    try {
      if (subscribed) {
        unsubscribe()
      } else {
        subscribe()
        unlockAudio()
        await completeStepMutation.mutateAsync('push')
      }
    } catch {
      notify(t('notification.errors.errorSubscribingToNotifications'), 'destructive')
    }
  }

  const handleMfaNavigate = () => {
    onClose()
    router.push(`/profile#${MFA_SECTION_ID}`)
  }

  const handlePushNavigate = () => {
    onClose()
    router.push(`/profile#${PUSH_SECTION_ID}`)
  }

  const handleNext = () => {
    if (isLastStep) {
      onClose()

      return
    }

    setStepIndex((current) => current + 1)
  }

  if (!activeStep) {
    return null
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-[480px]" isOverlayClosable>
        <DialogHeader>
          <DialogTitle>{t('onboarding.modal.title')}</DialogTitle>
          <DialogDescription>{t('onboarding.modal.description')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <div key={step.id} className={`h-1.5 flex-1 rounded-full ${index <= stepIndex ? 'bg-primary' : 'bg-muted'}`} aria-hidden />
            ))}
          </div>

          <StepPanel step={activeStep} onMfaNavigate={handleMfaNavigate} onPushNavigate={handlePushNavigate} />

          {activeStep.id === 'push' && permission !== 'unsupported' && (
            <div className="flex flex-col gap-3 rounded-lg border p-3">
              <IosPwaHint />
              <Button variant="outline" onClick={handlePushToggle}>
                {subscribed ? t('notification.ui.unsubscribe') : t('notification.ui.subscribe')}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={onClose}>
            {t('onboarding.modal.skip')}
          </Button>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button variant="outline" onClick={() => setStepIndex((current) => current - 1)}>
                {t('onboarding.modal.back')}
              </Button>
            )}
            <Button onClick={handleNext}>{isLastStep ? t('onboarding.modal.finish') : t('onboarding.modal.next')}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StepPanel({ step, onMfaNavigate, onPushNavigate }: { step: OnboardingStepStateModel; onMfaNavigate: () => void; onPushNavigate: () => void }) {
  const t = useT()

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <Typography variant="Body/M/Semibold">{t(`onboarding.steps.${step.id}.title`)}</Typography>
      <Typography variant="Body/S/Regular" className="text-muted-foreground">
        {t(`onboarding.steps.${step.id}.description`)}
      </Typography>
      {step.completed && (
        <Typography variant="Body/XS/Semibold" className="text-primary">
          {t('onboarding.done')}
        </Typography>
      )}
      {!step.completed && step.id === 'mfa' && (
        <Button variant="outline" size="sm-md" onClick={onMfaNavigate}>
          {t('onboarding.modal.openMfa')}
        </Button>
      )}
      {!step.completed && step.id === 'push' && (
        <Button variant="outline" size="sm-md" onClick={onPushNavigate}>
          {t('onboarding.modal.openPush')}
        </Button>
      )}
    </div>
  )
}
