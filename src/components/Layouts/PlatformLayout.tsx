'use client'

import { ActivityIcon, BarChart3Icon, BotIcon, EyeIcon, HomeIcon, TextQuoteIcon, UserIcon, WrenchIcon } from 'lucide-react'
import { useMemo } from 'react'

import { UserRole } from '~/api/user'
import { Sidebar } from '~/components/ui/sidebar'
import { routes } from '~/constants'
import { useAuth, useT } from '~/providers'

export const PlatformLayout = ({ children }: { children: React.ReactNode }) => {
  const t = useT()

  const { isLoading, isFetched, authUser } = useAuth()

  const navigation = useMemo(
    () => [
      {
        title: t('navigation.welcomePanel'),
        extra: true,
        defaultOpen: true,
        items: [
          {
            label: t(routes.home.tKey),
            icon: <HomeIcon width={16} height={16} />,
            href: routes.home.path,
          },
          {
            label: t(routes.uiKit.tKey),
            icon: <WrenchIcon width={16} height={16} />,
            href: routes.uiKit.path,
          },
          {
            label: t(routes.profile.tKey),
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
              title: t('navigation.adminPanel'),
              items: [
                {
                  label: t(routes.users.tKey),
                  icon: <UserIcon width={16} height={16} />,
                  disabled: authUser?.role !== UserRole.ADMIN,
                  href: routes.users.path,
                },
                {
                  label: t(routes.rumDashboard.tKey),
                  icon: <ActivityIcon width={16} height={16} />,
                  href: routes.rumDashboard.path,
                },
                {
                  label: t(routes.articleViewsDashboard.tKey),
                  icon: <EyeIcon width={16} height={16} />,
                  href: routes.articleViewsDashboard.path,
                },
                {
                  label: t(routes.aiReferralsDashboard.tKey),
                  icon: <BotIcon width={16} height={16} />,
                  href: routes.aiReferralsDashboard.path,
                },
                {
                  label: t(routes.llmUsageDashboard.tKey),
                  icon: <BarChart3Icon width={16} height={16} />,
                  disabled: authUser?.role !== UserRole.ADMIN,
                  href: routes.llmUsageDashboard.path,
                },
                {
                  label: t(routes.articles.tKey),
                  icon: <TextQuoteIcon width={16} height={16} />,
                  href: routes.articles.path,
                },
              ],
            },
          ]
        : []),
    ],
    [authUser?.role, t],
  )

  return <Sidebar navigation={isLoading || !isFetched ? [] : navigation}>{children}</Sidebar>
}
