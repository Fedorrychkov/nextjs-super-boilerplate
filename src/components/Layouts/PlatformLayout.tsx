'use client'

import { HomeIcon, TextQuoteIcon, UserIcon, WrenchIcon } from 'lucide-react'
import { useMemo } from 'react'

import { UserRole } from '~/api/user'
import { Sidebar } from '~/components/ui/sidebar'
import { routes } from '~/constants'
import { useAuth } from '~/providers'

export const PlatformLayout = ({ children }: { children: React.ReactNode }) => {
  const { isLoading, isFetched, authUser } = useAuth()

  const navigation = useMemo(
    () => [
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
      ...(authUser?.role && [UserRole.ADMIN, UserRole.EDITOR].includes(authUser?.role)
        ? [
            {
              extra: true,
              defaultOpen: true,
              title: 'Admin Panel',
              items: [
                {
                  label: routes.articles.name,
                  icon: <TextQuoteIcon width={16} height={16} />,
                  href: routes.articles.path,
                },
              ],
            },
          ]
        : []),
    ],
    [authUser?.role],
  )

  return <Sidebar navigation={isLoading || !isFetched ? [] : navigation}>{children}</Sidebar>
}
