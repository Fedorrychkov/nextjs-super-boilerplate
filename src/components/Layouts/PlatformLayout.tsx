'use client'

import { HomeIcon, UserIcon, WrenchIcon } from 'lucide-react'

import { Sidebar } from '~/components/ui/sidebar'
import { routes } from '~/constants'
import { useAuth } from '~/providers'

export const PlatformLayout = ({ children }: { children: React.ReactNode }) => {
  const { isLoading, isFetched } = useAuth()

  const navigation = [
    {
      title: 'Welcome Panel',
      extra: true,
      defaultOpen: true,
      items: [
        {
          label: routes.home.name,
          icon: <HomeIcon width={16} height={16} />,
          href: routes.home.path,
        },
        {
          label: routes.uiKit.name,
          icon: <WrenchIcon width={16} height={16} />,
          href: routes.uiKit.path,
        },
        {
          label: routes.profile.name,
          icon: <UserIcon width={16} height={16} />,
          href: routes.profile.path,
        },
      ],
    },
  ]

  return <Sidebar navigation={isLoading || !isFetched ? [] : navigation}>{children}</Sidebar>
}
