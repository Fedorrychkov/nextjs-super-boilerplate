'use client'

import { isProd } from '@config/env'
import { Bell } from 'lucide-react'

import { ClientSubscriptionApi } from '~/api/subscription'
import { AlertBlock, Button, Typography } from '~/components/ui'
import { useNotify } from '~/providers/notify'
import { usePush } from '~/providers/push'

export const NotificationBlock = () => {
  const { unlockAudio } = useNotify()
  const { subscribed, subscribe, unsubscribe } = usePush()

  const handleSubscribe = () => {
    if (subscribed) {
      unsubscribe()
    } else {
      subscribe()
      unlockAudio()
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
        <Typography variant="heading-3">Push Notifications</Typography>
      </div>
      <div className="flex flex-col gap-4">
        <Typography variant="Body/S/Regular">
          {subscribed
            ? 'You have successfully subscribed to updates'
            : 'To receive notifications when the tab is not active, please grant permission to notifications in the application'}
        </Typography>
        <Button variant="outline" onClick={handleSubscribe}>
          {subscribed ? 'Unsubscribe' : 'Subscribe'}
        </Button>
      </div>
      {subscribed && (
        <AlertBlock
          notify={{
            type: 'info',
            message: (
              <div className="flex flex-col gap-2">
                <Typography variant="Body/S/Regular">
                  If you are still not receiving notifications in the application, try &quot;Unsubscribe&quot; and reset all permissions for the site, refresh
                  the page and click &quot;Subscribe&quot; again.
                </Typography>
                <Typography variant="Body/S/Regular">
                  If that doesn&apos;t work, try to check browser permissions to notifications in your OS settings.
                </Typography>
              </div>
            ),
          }}
        />
      )}
      {subscribed && !isProd && (
        <div className="flex flex-row gap-2 justify-between flex-wrap">
          <Button variant="outline" onClick={handleTest}>
            Try send test notification NOW
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setTimeout(() => {
                handleTest()
              }, 5000)
            }}
          >
            Try send (DELAY 5 SECONDS)
          </Button>
        </div>
      )}
    </div>
  )
}
