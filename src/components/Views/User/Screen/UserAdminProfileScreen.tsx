'use client'

import { useMemo } from 'react'

import { TabsContainer } from '~/components/Blocks/Tabs/TabsContainer'
import { Typography } from '~/components/ui'
import { useT } from '~/providers'
import { useUserQuery } from '~/query/user/query'
import { time } from '~/utils/time'

type Props = {
  userId: string
}

export const UserAdminProfileScreen = ({ userId }: Props) => {
  const t = useT()
  const { data: user, isLoading } = useUserQuery(userId, Boolean(userId), { refetchOnWindowFocus: false })

  const tabs = useMemo(
    () => [
      {
        value: 'base',
        label: t('user.adminProfile.tabs.base'),
        children: (
          <div className="rounded-xl border p-4 flex flex-col gap-2">
            <Typography variant="Body/S/Semibold">{t('user.adminProfile.baseTitle')}</Typography>
            <Typography variant="Body/XS/Regular">ID: {user?.id ?? userId}</Typography>
            <Typography variant="Body/XS/Regular">Email: {user?.email ?? '-'}</Typography>
            <Typography variant="Body/XS/Regular">Role: {user?.role ?? '-'}</Typography>
            <Typography variant="Body/XS/Regular">Status: {user?.status ?? '-'}</Typography>
            <Typography variant="Body/XS/Regular">
              {t('common.createdAt')}: {user?.createdAt ? time(user.createdAt).format('DD/MM/YYYY HH:mm') : '-'}
            </Typography>
            <Typography variant="Body/XS/Regular">
              {t('common.updatedAt')}: {user?.updatedAt ? time(user.updatedAt).format('DD/MM/YYYY HH:mm') : '-'}
            </Typography>
          </div>
        ),
      },
    ],
    [t, user, userId],
  )

  return (
    <div className="w-full h-full flex flex-col flex-1 gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Typography variant="heading-3">{t('user.adminProfile.title')}</Typography>
          <Typography variant="Body/XS/Regular" className="text-muted-foreground">
            {isLoading ? '...' : (user?.email ?? userId)}
          </Typography>
        </div>
      </div>

      <TabsContainer tabs={tabs} searchMutable={false} mode="now" />
    </div>
  )
}
