'use client'

import { isProd } from '@config/env'
import { Bell } from 'lucide-react'

import { ClientSubscriptionApi } from '~/api/subscription'
import { AlertBlock, Button, Typography } from '~/components/ui'
import { useT } from '~/providers'
import { useNotify } from '~/providers/notify'
import { usePush } from '~/providers/push'
import { Logger } from '~/utils/logger'

const logger = new Logger(['NotificationBlock', '[src/components/Views/Notification/Blocks/NotificationBlock.tsx]'])

export const NotificationBlock = () => {
  const t = useT()
  const { unlockAudio, notify } = useNotify()
  const { subscribed, subscribe, unsubscribe } = usePush()

  const handleSubscribe = async () => {
    try {
      if (subscribed) {
        unsubscribe()
      } else {
        subscribe()
        unlockAudio()
      }
    } catch (error) {
      logger.error('Error subscribing to notifications', error)
      notify(t('notification.errors.errorSubscribingToNotifications'), 'destructive')
    }
  }

  const handleTest = () => {
    const api = new ClientSubscriptionApi()
    api.test({ type: 'test' })
  }

  return (
    <div className="flex flex-col rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-muted-foreground shrink-0" />
        <Typography variant="heading-3">{t('notification.ui.pushNotifications')}</Typography>
      </div>
      <div className="flex flex-col gap-4">
        <Typography variant="Body/S/Regular">
          {subscribed
            ? t('notification.ui.youHaveSuccessfullySubscribedToUpdates')
            : t('notification.ui.toReceiveNotificationsWhenTheTabIsNotActivePleaseGrantPermissionToNotificationsInTheApplication')}
        </Typography>
        <Button variant="outline" onClick={handleSubscribe}>
          {subscribed ? t('notification.ui.unsubscribe') : t('notification.ui.subscribe')}
        </Button>
      </div>
      {subscribed && (
        <AlertBlock
          notify={{
            type: 'info',
            message: (
              <div className="flex flex-col gap-2">
                <Typography variant="Body/S/Regular">
                  {t(
                    'notification.ui.ifYouAreStillNotReceivingNotificationsInTheApplicationTryUnsubscribeAndResetAllPermissionsForTheSiteRefreshThePageAndClickSubscribeAgain',
                  )}
                </Typography>
                <Typography variant="Body/S/Regular">
                  {t('notification.ui.ifThatDoesntWorkTryToCheckBrowserPermissionsToNotificationsInYourOSSettings')}
                </Typography>
              </div>
            ),
          }}
        />
      )}
      {subscribed && !isProd && (
        <div className="flex flex-row gap-2 justify-between flex-wrap">
          <Button variant="outline" onClick={handleTest}>
            {t('notification.ui.trySendTestNotificationNOW')}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setTimeout(() => {
                handleTest()
              }, 5000)
            }}
          >
            {t('notification.ui.trySendTestNotificationDelay5Seconds')}
          </Button>
        </div>
      )}
    </div>
  )
}
