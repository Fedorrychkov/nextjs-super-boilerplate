'use client'

import type { ApiTokenModel } from '~/api/api-token'
import { Badge, Button, Typography } from '~/components/ui'
import { useT } from '~/providers'
import { time } from '~/utils/time'

type Props = {
  items?: ApiTokenModel[]
  isLoading?: boolean
  onRevoke?: (id: string) => void
  isRevoking?: boolean
}

function tokenStatus(item: ApiTokenModel): 'revoked' | 'expired' | 'active' {
  if (item.revokedAt) {
    return 'revoked'
  }

  if (time(item.expiresAt).isBefore(time())) {
    return 'expired'
  }

  return 'active'
}

export const ApiTokensTable = ({ items = [], isLoading, onRevoke, isRevoking }: Props) => {
  const t = useT()

  if (isLoading) {
    return <Typography variant="Body/S/Regular">{t('common.loading')}</Typography>
  }

  if (!items.length) {
    return <Typography variant="Body/S/Regular">{t('apiTokens.empty')}</Typography>
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const status = tokenStatus(item)

        return (
          <div key={item.id} className="rounded-xl border p-4 flex flex-col gap-2">
            <div className="flex flex-row items-center justify-between gap-2">
              <Typography variant="Body/S/Semibold">{item.name}</Typography>
              <div className="flex flex-row items-center gap-1">
                {item.kind === 'oauth' && <Badge variant="outline">{t('apiTokens.kindOauth')}</Badge>}
                <Badge variant={status === 'active' ? 'default' : 'secondary'}>{t(`apiTokens.${status}`)}</Badge>
              </div>
            </div>
            <Typography variant="Body/XS/Regular" className="text-muted-foreground font-mono">
              {item.prefix}
            </Typography>
            <div className="flex flex-row flex-wrap gap-1">
              {item.scopes.map((scope) => (
                <Badge key={scope} variant="outline">
                  {scope}
                </Badge>
              ))}
            </div>
            <Typography variant="Body/XS/Regular" className="text-muted-foreground">
              {t('apiTokens.lastUsedAt')}: {item.lastUsedAt ? time(item.lastUsedAt).format('DD/MM/YYYY HH:mm:ss') : t('apiTokens.never')}
            </Typography>
            <Typography variant="Body/XS/Regular" className="text-muted-foreground">
              {t('apiTokens.expiresAt')}: {time(item.expiresAt).format('DD/MM/YYYY HH:mm')} · {t('apiTokens.createdAt')}:{' '}
              {item.createdAt ? time(item.createdAt).format('DD/MM/YYYY HH:mm') : '-'}
            </Typography>
            {status === 'active' && onRevoke && (
              <div>
                <Button variant="outline" size="sm-md" disabled={isRevoking} onClick={() => onRevoke(item.id)}>
                  {t('apiTokens.revoke')}
                </Button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
