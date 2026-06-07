'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import { NotificationDeliveryStatus, type PlatformNotificationModel } from '~/api/notification'
import { Badge, Button, Typography } from '~/components/ui'
import { routes } from '~/constants'
import type { AppMessageKey } from '~/lib/i18n'
import { useAuth, useT } from '~/providers'
import { time } from '~/utils/time'

type Props = {
  item: PlatformNotificationModel
  showAdminExtras?: boolean
}

function deliveryStatusVariant(status: NotificationDeliveryStatus): 'success' | 'destructive' | 'secondary' | 'outline' {
  if (status === NotificationDeliveryStatus.DELIVERED) {
    return 'success'
  }

  if (status === NotificationDeliveryStatus.FAILED) {
    return 'destructive'
  }

  return 'secondary'
}

export const NotificationListItem = ({ item, showAdminExtras = false }: Props) => {
  const t = useT()
  const { isAdmin } = useAuth()
  const [showRaw, setShowRaw] = useState(false)

  const typeLabel = useMemo(() => {
    const key = `platformNotifications.type.${item.type}` as AppMessageKey

    return t(key) === key ? item.type : t(key)
  }, [item.type, t])

  const sourceLabel = useMemo(() => {
    if (!item.source) {
      return null
    }

    const key = `platformNotifications.source.${item.source}` as AppMessageKey

    return t(key) === key ? item.source : t(key)
  }, [item.source, t])

  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <Typography variant="Body/M/Semibold">{item.title}</Typography>
          <Typography variant="Body/S/Regular" className="text-muted-foreground">
            {item.body}
          </Typography>
        </div>
        <Badge variant={deliveryStatusVariant(item.deliveryStatus)}>{t(`platformNotifications.deliveryStatus.${item.deliveryStatus}` as AppMessageKey)}</Badge>
      </div>

      <div className="flex flex-wrap gap-2 text-muted-foreground">
        <Typography variant="Body/XS/Regular">
          {t('platformNotifications.typeLabel')}: {typeLabel}
        </Typography>
        {sourceLabel && (
          <Typography variant="Body/XS/Regular">
            {t('platformNotifications.sourceLabel')}: {sourceLabel}
          </Typography>
        )}
        <Typography variant="Body/XS/Regular">{item.createdAt ? time(item.createdAt).format('DD/MM/YYYY HH:mm') : '-'}</Typography>
      </div>

      {item.channelDeliveries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {item.channelDeliveries.map((delivery) => (
            <Badge key={delivery.channel} variant="outline">
              {t(`platformNotifications.channel.${delivery.channel}` as AppMessageKey)}:{' '}
              {t(`platformNotifications.deliveryStatus.${delivery.status}` as AppMessageKey)}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm-md" asChild>
          <Link href={item.urlPath}>{t('platformNotifications.openTarget')}</Link>
        </Button>
        {isAdmin && item.recipientUserId && (
          <Button variant="outline" size="sm-md" asChild>
            <Link href={`${routes.users.path}/${item.recipientUserId}`}>{t('user.adminProfile.title')}</Link>
          </Button>
        )}
        {showAdminExtras && (
          <Button variant="ghost" size="sm-md" onClick={() => setShowRaw((prev) => !prev)}>
            {showRaw ? t('platformNotifications.rawHide') : t('platformNotifications.raw')}
          </Button>
        )}
      </div>

      {showRaw && <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(item, null, 2)}</pre>}
    </div>
  )
}
