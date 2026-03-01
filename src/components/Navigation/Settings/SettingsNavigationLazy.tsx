'use client'

import { AlertCircleIcon, BadgeDollarSign, BellIcon, ChartLineIcon, MessageCircleIcon, UserCheckIcon, UserRoundIcon } from 'lucide-react'
import { Suspense } from 'react'

import { SpinnerScreen } from '../../Loaders'
import { NavItem } from '../types'
import { SettingsNavigation } from './SettingsNavigation'

type Props = {
  nav: NavItem[]
}

const nav = [
  { title: 'Profile', url: '/admin/users/[userId]', icon: <UserRoundIcon width={16} height={16} /> },
  { title: 'Verifications', url: '/admin/users/[userId]/verification', icon: <UserCheckIcon width={16} height={16} /> },
  { title: 'Analytics', url: '/admin/users/[userId]/analytics', icon: <ChartLineIcon width={16} height={16} /> },
  { title: 'Notifications', url: '/admin/users/[userId]/notification', icon: <BellIcon width={16} height={16} /> },
  { title: 'Reports', url: '/admin/users/[userId]/reports', icon: <AlertCircleIcon width={16} height={16} /> },
  { title: 'Chats', url: '/admin/users/[userId]/chats', icon: <MessageCircleIcon width={16} height={16} /> },
  { title: 'Subscriptions', url: '/admin/users/[userId]/subscription', icon: <BadgeDollarSign width={16} height={16} /> },
]

export const SettingsNavigationLazy = (props: Omit<Props, 'nav'>) => {
  return (
    <Suspense fallback={<SpinnerScreen />}>
      <SettingsNavigation nav={nav} {...props} />
    </Suspense>
  )
}
