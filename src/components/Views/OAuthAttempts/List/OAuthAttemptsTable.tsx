'use client'

import Link from 'next/link'

import type { OAuthAttemptItemModel } from '~/api/oauth/types'
import { Button, Typography } from '~/components/ui'
import { OAUTH_PROVIDER_LABELS } from '~/lib/auth/oauth-public-config'
import type { AppMessageKey } from '~/lib/i18n'
import { useT } from '~/providers'
import { time } from '~/utils/time'

import { OAuthAttemptOutcomeBadge } from './OAuthAttemptsOutcomeFilter'

type Props = {
  items?: OAuthAttemptItemModel[]
  isLoading?: boolean
}

export const OAuthAttemptsTable = ({ items = [], isLoading }: Props) => {
  const t = useT()

  if (isLoading) {
    return <Typography variant="Body/S/Regular">{t('common.loading')}</Typography>
  }

  if (!items.length) {
    return <Typography variant="Body/S/Regular">{t('oauthAttempts.empty')}</Typography>
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-xl border p-4 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Typography variant="Body/S/Semibold">{OAUTH_PROVIDER_LABELS[item.provider] ?? item.provider}</Typography>
            <OAuthAttemptOutcomeBadge outcome={item.outcome} />
            <Typography variant="Body/XS/Regular" className="text-muted-foreground">
              {t(`oauthAttempts.flows.${item.flow}` as AppMessageKey)}
            </Typography>
          </div>

          {item.providerEmail ? (
            <Typography variant="Body/XS/Regular" className="text-muted-foreground">
              {t('oauthAttempts.providerEmail')}: {item.providerEmail}
            </Typography>
          ) : null}

          <Typography variant="Body/XS/Regular" className="text-muted-foreground">
            {t('oauthAttempts.providerUserId')}: {item.providerUserId}
          </Typography>

          {item.collisionUserId ? (
            <div className="flex flex-col gap-1">
              <Typography variant="Body/XS/Regular" className="text-muted-foreground">
                {t('oauthAttempts.collisionUser')}: {item.collisionUserId}
              </Typography>
              <Button variant="outline" size="sm-md" asChild>
                <Link href={`/admin/users/${item.collisionUserId}`}>{t('user.adminProfile.title')}</Link>
              </Button>
            </div>
          ) : null}

          {item.actorUserId ? (
            <div className="flex flex-col gap-1">
              <Typography variant="Body/XS/Regular" className="text-muted-foreground">
                {t('oauthAttempts.actorUser')}: {item.actorUserId}
              </Typography>
              <Button variant="outline" size="sm-md" asChild>
                <Link href={`/admin/users/${item.actorUserId}`}>{t('user.adminProfile.title')}</Link>
              </Button>
            </div>
          ) : null}

          {item.ip ? (
            <Typography variant="Body/XS/Regular" className="text-muted-foreground">
              IP: {item.ip}
            </Typography>
          ) : null}

          <Typography variant="Body/XS/Regular" className="text-muted-foreground">
            {item.createdAt ? time(item.createdAt).format('DD/MM/YYYY HH:mm:ss') : '-'}
          </Typography>
        </div>
      ))}
    </div>
  )
}
