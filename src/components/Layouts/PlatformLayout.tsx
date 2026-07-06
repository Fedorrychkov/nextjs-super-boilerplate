'use client'

import {
  ActivityIcon,
  BarChart3Icon,
  BellIcon,
  BotIcon,
  EyeIcon,
  HomeIcon,
  KeyRoundIcon,
  KeySquareIcon,
  LanguagesIcon,
  ShieldCheckIcon,
  TextQuoteIcon,
  UserIcon,
  WrenchIcon,
} from 'lucide-react'
import { useMemo } from 'react'

import { UserRole } from '~/api/user'
import { Sidebar } from '~/components/ui/sidebar'
import { routes } from '~/constants'
import { useAuth, useT } from '~/providers'
import { ThemeShell } from '~/providers/theme'
import { useApiTokenPermissionsQuery } from '~/query/api-token'

const isApiTokensNavEnabled = process.env.NEXT_PUBLIC_API_TOKENS_ENABLED === '1' || process.env.NEXT_PUBLIC_API_TOKENS_ENABLED === 'true'

export const PlatformLayout = ({ children }: { children: React.ReactNode }) => {
  const t = useT()

  const { isLoading, isFetched, authUser } = useAuth()

  // Self-service PAT nav item for non-admin roles: visible only when the role policy allows it.
  const { data: apiTokenPermissions } = useApiTokenPermissionsQuery(isApiTokensNavEnabled && Boolean(authUser) && authUser?.role !== UserRole.ADMIN)
  const canUseApiTokens = Boolean(apiTokenPermissions?.allowed) && !apiTokenPermissions?.isAdmin

  const navigation = useMemo(
    () => [
      {
        id: 'welcome',
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
          {
            label: t(routes.notifications.tKey),
            icon: <BellIcon width={16} height={16} />,
            href: routes.notifications.path,
          },
          ...(canUseApiTokens
            ? [
                {
                  label: t(routes.profileApiTokens.tKey),
                  icon: <KeySquareIcon width={16} height={16} />,
                  href: routes.profileApiTokens.path,
                },
              ]
            : []),
        ],
      },
      ...(authUser?.role && [UserRole.ADMIN, UserRole.EDITOR].includes(authUser?.role)
        ? [
            {
              id: 'admin',
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
                  label: t(routes.i18nDashboard.tKey),
                  icon: <LanguagesIcon width={16} height={16} />,
                  href: routes.i18nDashboard.path,
                },
                {
                  label: t(routes.articles.tKey),
                  icon: <TextQuoteIcon width={16} height={16} />,
                  href: routes.articles.path,
                },
                {
                  label: t(routes.adminNotifications.tKey),
                  icon: <BellIcon width={16} height={16} />,
                  disabled: authUser?.role !== UserRole.ADMIN,
                  href: routes.adminNotifications.path,
                },
                {
                  label: t(routes.adminSecurityAudit.tKey),
                  icon: <ShieldCheckIcon width={16} height={16} />,
                  disabled: authUser?.role !== UserRole.ADMIN,
                  href: routes.adminSecurityAudit.path,
                },
                {
                  label: t(routes.adminOAuthAttempts.tKey),
                  icon: <KeyRoundIcon width={16} height={16} />,
                  disabled: authUser?.role !== UserRole.ADMIN,
                  href: routes.adminOAuthAttempts.path,
                },
                ...(process.env.NEXT_PUBLIC_API_TOKENS_ENABLED === '1' || process.env.NEXT_PUBLIC_API_TOKENS_ENABLED === 'true'
                  ? [
                      {
                        label: t(routes.adminApiTokens.tKey),
                        icon: <KeySquareIcon width={16} height={16} />,
                        disabled: authUser?.role !== UserRole.ADMIN,
                        href: routes.adminApiTokens.path,
                      },
                      {
                        label: t(routes.adminMachineAccess.tKey),
                        icon: <ActivityIcon width={16} height={16} />,
                        disabled: authUser?.role !== UserRole.ADMIN,
                        href: routes.adminMachineAccess.path,
                      },
                    ]
                  : []),
              ],
            },
          ]
        : []),
    ],
    [authUser?.role, canUseApiTokens, t],
  )

  return (
    <ThemeShell className="flex min-h-full flex-1 flex-col">
      <Sidebar navigation={isLoading || !isFetched ? [] : navigation}>{children}</Sidebar>
    </ThemeShell>
  )
}
