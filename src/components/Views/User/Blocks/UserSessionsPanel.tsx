'use client'

import { Button, Typography } from '~/components/ui'
import { useT } from '~/providers'
import { useNotify } from '~/providers/notify'
import { useRevokeSessionMutation, useSessionsQuery } from '~/query/account'

import { UserSessionsTable } from '../List/UserSessionsTable'

export const UserSessionsPanel = () => {
  const t = useT()
  const { notify } = useNotify()
  const { data, isLoading, refetch } = useSessionsQuery(true)
  const { revokeSessionMutation, revokeOtherSessionsMutation } = useRevokeSessionMutation()

  if (data && data.enabled === false) {
    return null
  }

  const handleDelete = async (item: { id: string }) => {
    if (!window.confirm(t('user.sessions.revokeConfirm'))) {
      return
    }

    try {
      await revokeSessionMutation.mutateAsync(item.id)
      await refetch()
      notify(t('user.sessions.revoked'), 'success')
    } catch {
      notify(t('user.sessions.revokeFailed'), 'destructive')
    }
  }

  const handleRevokeOthers = async () => {
    if (!window.confirm(t('user.sessions.revokeOthersConfirm'))) {
      return
    }

    try {
      await revokeOtherSessionsMutation.mutateAsync()
      await refetch()
      notify(t('user.sessions.revokedOthers'), 'success')
    } catch {
      notify(t('user.sessions.revokeFailed'), 'destructive')
    }
  }

  const hasOtherSessions = (data?.list ?? []).some((item) => !item.isCurrent)

  return (
    <div className="flex flex-col rounded-lg border bg-card p-4 space-y-4">
      <Typography variant="heading-3">{t('user.sessions.title')}</Typography>
      <UserSessionsTable
        items={data?.list}
        isLoading={isLoading}
        onDelete={handleDelete}
        deletingId={revokeSessionMutation.isLoading ? revokeSessionMutation.variables : null}
      />
      {hasOtherSessions && (
        <Button variant="outline" disabled={revokeOtherSessionsMutation.isLoading} onClick={handleRevokeOthers}>
          {t('user.sessions.revokeOthers')}
        </Button>
      )}
    </div>
  )
}
