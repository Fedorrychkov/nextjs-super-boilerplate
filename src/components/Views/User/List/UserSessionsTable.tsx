'use client'

import { Trash2Icon } from 'lucide-react'

import type { SessionAdminItemModel, SessionPublicItemModel } from '~/api/account/client'
import { Button, Typography } from '~/components/ui'
import { useT } from '~/providers'
import { time } from '~/utils/time'

type Props = {
  items?: SessionPublicItemModel[] | SessionAdminItemModel[]
  isLoading?: boolean
  onDelete?: (item: SessionPublicItemModel | SessionAdminItemModel) => void
  deletingId?: string | null
  showSensitiveDetails?: boolean
}

export const UserSessionsTable = ({ items = [], isLoading, onDelete, deletingId, showSensitiveDetails = false }: Props) => {
  const t = useT()

  if (isLoading) {
    return <Typography variant="Body/S/Regular">{t('common.loading')}</Typography>
  }

  if (!items.length) {
    return <Typography variant="Body/S/Regular">{t('user.sessions.empty')}</Typography>
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-xl border p-4 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Typography variant="Body/S/Semibold">{item.deviceLabel}</Typography>
            {item.isCurrent && (
              <Typography variant="Body/XS/Semibold" className="text-primary">
                {t('user.sessions.currentDevice')}
              </Typography>
            )}
          </div>
          <Typography variant="Body/XS/Regular" className="text-muted-foreground">
            {t('user.sessions.loginAt')}: {item.loginAt ? time(item.loginAt).format('DD/MM/YYYY HH:mm') : '-'}
          </Typography>
          <Typography variant="Body/XS/Regular" className="text-muted-foreground">
            {t('user.sessions.lastSeenAt')}: {item.lastSeenAt ? time(item.lastSeenAt).format('DD/MM/YYYY HH:mm') : '-'}
          </Typography>
          {showSensitiveDetails && 'userAgent' in item && (
            <>
              {item.ip && (
                <Typography variant="Body/XS/Regular" className="text-muted-foreground">
                  IP: {item.ip}
                </Typography>
              )}
              {item.userAgent && (
                <Typography variant="Body/XS/Regular" className="text-muted-foreground break-all">
                  {item.userAgent}
                </Typography>
              )}
            </>
          )}
          {!item.isCurrent && onDelete && (
            <div className="flex flex-wrap gap-2">
              <Button variant="destructive" size="sm-md" disabled={deletingId === item.id} onClick={() => onDelete(item)}>
                <Trash2Icon className="h-4 w-4 mr-1" />
                {t('user.sessions.revoke')}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
