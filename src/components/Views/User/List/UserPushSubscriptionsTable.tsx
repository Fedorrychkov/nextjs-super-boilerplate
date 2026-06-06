'use client'

import { Trash2Icon } from 'lucide-react'

import { Button, Typography } from '~/components/ui'
import type { AppMessageKey } from '~/lib/i18n'
import { useT } from '~/providers'
import { time } from '~/utils/time'

import { isAdminPushSubscriptionItem, type TableItem } from '../types'

type Props = {
  items?: TableItem[]
  currentEndpoint?: string | null
  isLoading?: boolean
  onDelete?: (item: TableItem) => void
  deletingId?: string | null
  allowCurrentDeviceActions?: boolean
  onUnsubscribeCurrent?: () => void
  /** Admin view: show endpoint URL and user-agent */
  showSensitiveDetails?: boolean
}

export const UserPushSubscriptionsTable = ({
  items = [],
  currentEndpoint,
  isLoading,
  onDelete,
  deletingId,
  allowCurrentDeviceActions = false,
  onUnsubscribeCurrent,
  showSensitiveDetails = false,
}: Props) => {
  const t = useT()

  if (isLoading) {
    return <Typography variant="Body/S/Regular">{t('common.loading')}</Typography>
  }

  if (!items.length) {
    return <Typography variant="Body/S/Regular">{t('user.adminProfile.pushSubscriptions.empty')}</Typography>
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const isCurrent = isAdminPushSubscriptionItem(item) ? Boolean(currentEndpoint && item.endpoint === currentEndpoint) : item.isCurrent

        return (
          <div key={item.id} className="rounded-xl border p-4 flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Typography variant="Body/S/Semibold">{t(`user.adminProfile.pushSubscriptions.providers.${item.provider}` as AppMessageKey)}</Typography>
              {isCurrent && (
                <Typography variant="Body/XS/Semibold" className="text-primary">
                  {t('user.profile.pushSubscriptions.currentDevice')}
                </Typography>
              )}
            </div>
            {showSensitiveDetails && isAdminPushSubscriptionItem(item) && (
              <>
                <Typography variant="Body/XS/Regular" className="break-all text-muted-foreground">
                  {item.endpoint}
                </Typography>
                {item.userAgent && (
                  <Typography variant="Body/XS/Regular" className="text-muted-foreground">
                    {item.userAgent}
                  </Typography>
                )}
              </>
            )}
            <Typography variant="Body/XS/Regular" className="text-muted-foreground">
              {item.createdAt ? time(item.createdAt).format('DD/MM/YYYY HH:mm') : '-'}
            </Typography>
            <div className="flex flex-wrap gap-2">
              {isCurrent && allowCurrentDeviceActions ? (
                <Button variant="outline" size="sm-md" onClick={onUnsubscribeCurrent}>
                  {t('user.profile.pushSubscriptions.revokeDevice')}
                </Button>
              ) : (
                onDelete && (
                  <Button variant="destructive" size="sm-md" disabled={deletingId === item.id} onClick={() => onDelete(item)}>
                    <Trash2Icon className="h-4 w-4 mr-1" />
                    {t('user.adminProfile.pushSubscriptions.delete')}
                  </Button>
                )
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
