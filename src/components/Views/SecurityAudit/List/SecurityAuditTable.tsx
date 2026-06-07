'use client'

import Link from 'next/link'

import type { SecurityAuditItemModel } from '~/api/security-audit'
import { Button, Typography } from '~/components/ui'
import type { AppMessageKey } from '~/lib/i18n'
import { useT } from '~/providers'
import { time } from '~/utils/time'

type Props = {
  items?: SecurityAuditItemModel[]
  isLoading?: boolean
}

export const SecurityAuditTable = ({ items = [], isLoading }: Props) => {
  const t = useT()

  if (isLoading) {
    return <Typography variant="Body/S/Regular">{t('common.loading')}</Typography>
  }

  if (!items.length) {
    return <Typography variant="Body/S/Regular">{t('securityAudit.empty')}</Typography>
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-xl border p-4 flex flex-col gap-2">
          <Typography variant="Body/S/Semibold">{t(`securityAudit.actions.${item.action}` as AppMessageKey)}</Typography>
          <div className="flex flex-col gap-1">
            <Typography variant="Body/XS/Regular" className="text-muted-foreground">
              {t('securityAudit.targetUser')}: {item.targetUserId ?? t('securityAudit.systemActor')}
            </Typography>
            {item.targetUserId && (
              <Button variant="outline" size="sm-md" asChild>
                <Link href={`/admin/users/${item.targetUserId}`}>{t('user.adminProfile.title')}</Link>
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <Typography variant="Body/XS/Regular" className="text-muted-foreground">
              {t('securityAudit.actorUser')}: {item.actorUserId ?? t('securityAudit.systemActor')}
            </Typography>
            {item.actorUserId && (
              <Button variant="outline" size="sm-md" asChild>
                <Link href={`/admin/users/${item.actorUserId}`}>{t('user.adminProfile.title')}</Link>
              </Button>
            )}
          </div>
          <Typography variant="Body/XS/Regular" className="text-muted-foreground">
            {item.createdAt ? time(item.createdAt).format('DD/MM/YYYY HH:mm:ss') : '-'}
          </Typography>
        </div>
      ))}
    </div>
  )
}
