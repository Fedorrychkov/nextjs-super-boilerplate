'use client'

import { useState } from 'react'

import type { MachineAccessUsageCounts, MachineAccessUserRow } from '~/api/machine-access'
import { usePagination } from '~/components/List/usePagination'
import { Badge, Typography } from '~/components/ui'
import { Button } from '~/components/ui/button'
import type { AppMessageKey } from '~/lib/i18n/types'
import { useT } from '~/providers'
import { useApiTokenRevokeMutation } from '~/query/api-token'
import { useMachineAccessBlockMutation, useMachineAccessUserDetailQuery, useMachineAccessUsersQuery } from '~/query/machine-access'
import { time } from '~/utils/time'

const PAGE_LIMIT = 25

/** `142 (12 mcp)` — total requests in the window, with the MCP tool-call share. */
const UsageCell = ({ usage }: { usage: MachineAccessUsageCounts }) => {
  const t = useT()

  return (
    <div className="flex flex-row flex-wrap gap-x-3 gap-y-1">
      {(Object.keys(usage) as (keyof MachineAccessUsageCounts)[]).map((window) => (
        <Typography key={window} asTag="span" variant="Body/XS/Regular" tone="muted">
          {t(`machineAccess.windows.${window}` as AppMessageKey)}: {usage[window].total}
          {usage[window].mcp ? ` (${usage[window].mcp} mcp)` : ''}
        </Typography>
      ))}
    </div>
  )
}

const UserDetail = ({ userId }: { userId: string }) => {
  const t = useT()
  const { data, isLoading } = useMachineAccessUserDetailQuery(userId)
  const { apiTokenRevokeMutation } = useApiTokenRevokeMutation()

  if (isLoading || !data) {
    return (
      <Typography variant="Body/S/Regular" tone="muted">
        {t('common.loading')}
      </Typography>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Typography variant="Body/M/Semibold">{t('machineAccess.tokensTitle')}</Typography>
        {data.tokens.map((token) => {
          const isActive = !token.revokedAt && time(token.expiresAt).isAfter(time())

          return (
            <div key={token.id} className="rounded-lg border p-3 flex flex-col gap-2">
              <div className="flex flex-row items-center justify-between gap-2">
                <div className="flex flex-row items-center gap-2">
                  <Typography variant="Body/S/Semibold">{token.name}</Typography>
                  <Badge variant="outline">{token.kind === 'oauth' ? t('apiTokens.kindOauth') : 'PAT'}</Badge>
                  {!isActive && <Badge variant="secondary">{token.revokedAt ? t('apiTokens.revoked') : t('apiTokens.expired')}</Badge>}
                </div>
                {isActive && (
                  <Button variant="outline" size="sm" disabled={apiTokenRevokeMutation.isLoading} onClick={() => apiTokenRevokeMutation.mutate(token.id)}>
                    {t('apiTokens.revoke')}
                  </Button>
                )}
              </div>
              <UsageCell usage={token.usage} />
            </div>
          )
        })}
      </div>

      {data.grants.length > 0 && (
        <div className="flex flex-col gap-2">
          <Typography variant="Body/M/Semibold">{t('machineAccess.grantsTitle')}</Typography>
          {data.grants.map((grant) => (
            <div key={grant.id} className="rounded-lg border p-3 flex flex-row flex-wrap items-center gap-x-3 gap-y-1">
              <Typography variant="Body/S/Semibold">{grant.clientName}</Typography>
              <Typography asTag="span" variant="Body/XS/Regular" tone="muted">
                {grant.scopes.join(', ')}
              </Typography>
              <Typography asTag="span" variant="Body/XS/Regular" tone="muted">
                {t('apiTokens.expiresAt')}: {time(grant.expiresAt).format('DD/MM/YYYY')}
              </Typography>
              {grant.revokedAt && <Badge variant="secondary">{t('apiTokens.revoked')}</Badge>}
            </div>
          ))}
        </div>
      )}

      {data.recentEvents.length > 0 && (
        <div className="flex flex-col gap-2">
          <Typography variant="Body/M/Semibold">{t('machineAccess.recentTitle')}</Typography>
          <div className="flex flex-col gap-1">
            {data.recentEvents.map((event, index) => (
              <Typography key={`${event.at}-${index}`} variant="Body/XS/Regular" tone="muted" className="font-mono">
                {time(event.at).format('DD/MM HH:mm:ss')} · {event.transport} · {event.tool || `${event.method} ${event.path}`}
              </Typography>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Admin oversight of machine access: who has PATs/OAuth connections, how much they call the
 * platform (rolling windows over the full request time series), revoke a single token or
 * block the user's machine access entirely (abuse / overload kill-switch).
 */
export const MachineAccessScreen = () => {
  const t = useT()
  const { offset } = usePagination({ limit: PAGE_LIMIT })
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const { data, isLoading } = useMachineAccessUsersQuery({ limit: PAGE_LIMIT, offset })
  const { machineAccessBlockMutation } = useMachineAccessBlockMutation()

  const onToggleBlock = (row: MachineAccessUserRow) => {
    machineAccessBlockMutation.mutate({ userId: row.userId, blocked: !row.machineAccessBlockedAt })
  }

  if (isLoading) {
    return <Typography variant="Body/S/Regular">{t('common.loading')}</Typography>
  }

  const rows = data?.list ?? []

  return (
    <div className="flex flex-col gap-4">
      <Typography asTag="h1" variant="heading-2">
        {t('machineAccess.title')}
      </Typography>
      <Typography variant="Body/S/Regular" tone="muted">
        {t('machineAccess.hint')}
      </Typography>

      {!rows.length && <Typography variant="Body/S/Regular">{t('machineAccess.empty')}</Typography>}

      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.userId} className="rounded-xl border p-4 flex flex-col gap-2">
            <div className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <div className="flex flex-row items-center gap-2 flex-wrap">
                <Typography variant="Body/S/Semibold">{row.email}</Typography>
                <Badge variant="outline">{row.role}</Badge>
                {row.machineAccessBlockedAt && <Badge variant="secondary">{t('machineAccess.blocked')}</Badge>}
              </div>
              <div className="flex flex-row items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedUserId((current) => (current === row.userId ? null : row.userId))}>
                  {selectedUserId === row.userId ? t('machineAccess.hideDetail') : t('machineAccess.showDetail')}
                </Button>
                <Button
                  variant={row.machineAccessBlockedAt ? 'default' : 'outline'}
                  size="sm"
                  disabled={machineAccessBlockMutation.isLoading}
                  onClick={() => onToggleBlock(row)}
                >
                  {row.machineAccessBlockedAt ? t('machineAccess.unblock') : t('machineAccess.block')}
                </Button>
              </div>
            </div>

            <Typography variant="Body/XS/Regular" tone="muted">
              PAT: {row.activePatCount} · OAuth: {row.activeOauthCount} · {t('machineAccess.tokensTotal')}: {row.tokensTotal} · {t('apiTokens.lastUsedAt')}:{' '}
              {row.lastUsedAt ? time(row.lastUsedAt).format('DD/MM/YYYY HH:mm') : t('apiTokens.never')}
            </Typography>

            <UsageCell usage={row.usage} />

            {selectedUserId === row.userId && (
              <div className="mt-2 border-t pt-3">
                <UserDetail userId={row.userId} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
