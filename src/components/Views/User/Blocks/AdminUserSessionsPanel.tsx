'use client'

import { Button, Typography } from '~/components/ui'
import { useT } from '~/providers'
import { useNotify } from '~/providers/notify'
import { useRevokeUserSessionAdminMutation, useUserSessionsAdminQuery } from '~/query/account'

import { UserSessionsTable } from '../List/UserSessionsTable'

type Props = {
  userId: string
}

export const AdminUserSessionsPanel = ({ userId }: Props) => {
  const t = useT()
  const { notify } = useNotify()
  const { data, isLoading, refetch } = useUserSessionsAdminQuery(userId, true)
  const { revokeUserSessionAdminMutation, revokeAllUserSessionsAdminMutation } = useRevokeUserSessionAdminMutation()

  if (data && data.enabled === false) {
    return (
      <Typography variant="Body/S/Regular" className="text-muted-foreground">
        {t('user.sessions.errors.featureDisabled')}
      </Typography>
    )
  }

  const handleDelete = async (item: { id: string }) => {
    if (!window.confirm(t('user.adminProfile.sessions.revokeConfirm'))) {
      return
    }

    try {
      await revokeUserSessionAdminMutation.mutateAsync({ userId, sessionId: item.id })
      await refetch()
      notify(t('user.adminProfile.sessions.revoked'), 'success')
    } catch {
      notify(t('user.adminProfile.sessions.revokeFailed'), 'destructive')
    }
  }

  const handleRevokeAll = async () => {
    if (!window.confirm(t('user.adminProfile.sessions.revokeAllConfirm'))) {
      return
    }

    try {
      await revokeAllUserSessionsAdminMutation.mutateAsync(userId)
      await refetch()
      notify(t('user.adminProfile.sessions.revokedAll'), 'success')
    } catch {
      notify(t('user.adminProfile.sessions.revokeFailed'), 'destructive')
    }
  }

  return (
    <div className="flex flex-col rounded-lg border bg-card p-4 space-y-4">
      <Typography variant="heading-3">{t('user.adminProfile.sessions.title')}</Typography>
      <UserSessionsTable
        items={data?.list}
        isLoading={isLoading}
        onDelete={handleDelete}
        deletingId={revokeUserSessionAdminMutation.isLoading ? revokeUserSessionAdminMutation.variables?.sessionId : null}
        showSensitiveDetails
      />
      {(data?.list?.length ?? 0) > 0 && (
        <Button variant="destructive" disabled={revokeAllUserSessionsAdminMutation.isLoading} onClick={handleRevokeAll}>
          {t('user.adminProfile.sessions.revokeAll')}
        </Button>
      )}
    </div>
  )
}
