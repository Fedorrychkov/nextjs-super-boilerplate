'use client'

import {
  ActivityIcon,
  BarChart3Icon,
  BellIcon,
  BotIcon,
  CpuIcon,
  EyeIcon,
  HomeIcon,
  KeyRoundIcon,
  KeySquareIcon,
  LanguagesIcon,
  LayoutDashboardIcon,
  PlugZapIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  TextQuoteIcon,
  UserIcon,
  WrenchIcon,
} from 'lucide-react'
import { useMemo } from 'react'

import { UserRole } from '~/api/user'
import { type NavigationSection, Sidebar } from '~/components/ui/sidebar'
import { routes } from '~/constants'
import { useAuth, useT } from '~/providers'
import { ThemeShell } from '~/providers/theme'
import { useApiTokenPermissionsQuery } from '~/query/api-token'

const isApiTokensNavEnabled = process.env.NEXT_PUBLIC_API_TOKENS_ENABLED === '1' || process.env.NEXT_PUBLIC_API_TOKENS_ENABLED === 'true'

const icon = (Icon: typeof HomeIcon) => <Icon width={16} height={16} />

/**
 * Admin menu in groups by task, not one flat list of fifteen links. `adminOnly` items are hidden
 * from editors; a group left with nothing visible is dropped by the sidebar. The first group keeps
 * the id `admin`, so a section state saved before the split stays where it was.
 */
const adminNavigation = (t: ReturnType<typeof useT>, notAdmin: boolean): NavigationSection[] => [
  {
    id: 'admin',
    extra: true,
    defaultOpen: true,
    title: t('navigation.adminPanel'),
    items: [
      { label: t(routes.adminOverview.tKey), icon: icon(LayoutDashboardIcon), disabled: notAdmin, href: routes.adminOverview.path },
      { label: t(routes.users.tKey), icon: icon(UserIcon), disabled: notAdmin, href: routes.users.path },
      { label: t(routes.adminNotifications.tKey), icon: icon(BellIcon), disabled: notAdmin, href: routes.adminNotifications.path },
      { label: t(routes.adminPlatformSettings.tKey), icon: icon(SlidersHorizontalIcon), disabled: notAdmin, href: routes.adminPlatformSettings.path },
    ],
  },
  {
    id: 'admin-content',
    extra: true,
    defaultOpen: true,
    title: t('navigation.adminGroupContent'),
    items: [
      { label: t(routes.articles.tKey), icon: icon(TextQuoteIcon), href: routes.articles.path },
      { label: t(routes.i18nDashboard.tKey), icon: icon(LanguagesIcon), href: routes.i18nDashboard.path },
    ],
  },
  {
    id: 'admin-analytics',
    extra: true,
    defaultOpen: true,
    title: t('navigation.adminGroupAnalytics'),
    items: [
      { label: t(routes.adminMetrics.tKey), icon: icon(BarChart3Icon), disabled: notAdmin, href: routes.adminMetrics.path },
      { label: t(routes.rumDashboard.tKey), icon: icon(ActivityIcon), href: routes.rumDashboard.path },
      { label: t(routes.articleViewsDashboard.tKey), icon: icon(EyeIcon), href: routes.articleViewsDashboard.path },
      { label: t(routes.aiReferralsDashboard.tKey), icon: icon(BotIcon), href: routes.aiReferralsDashboard.path },
      { label: t(routes.llmUsageDashboard.tKey), icon: icon(CpuIcon), disabled: notAdmin, href: routes.llmUsageDashboard.path },
    ],
  },
  {
    id: 'admin-access',
    extra: true,
    defaultOpen: false,
    title: t('navigation.adminGroupAccess'),
    items: [
      { label: t(routes.adminSecurityAudit.tKey), icon: icon(ShieldCheckIcon), disabled: notAdmin, href: routes.adminSecurityAudit.path },
      { label: t(routes.adminOAuthAttempts.tKey), icon: icon(KeyRoundIcon), disabled: notAdmin, href: routes.adminOAuthAttempts.path },
      ...(isApiTokensNavEnabled
        ? [
            { label: t(routes.adminApiTokens.tKey), icon: icon(KeySquareIcon), disabled: notAdmin, href: routes.adminApiTokens.path },
            { label: t(routes.adminMachineAccess.tKey), icon: icon(PlugZapIcon), disabled: notAdmin, href: routes.adminMachineAccess.path },
          ]
        : []),
    ],
  },
]

export const PlatformLayout = ({ children }: { children: React.ReactNode }) => {
  const t = useT()

  const { isLoading, isFetched, authUser } = useAuth()

  // Self-service PAT nav item for non-admin roles: visible only when the role policy allows it.
  const { data: apiTokenPermissions } = useApiTokenPermissionsQuery(isApiTokensNavEnabled && Boolean(authUser) && authUser?.role !== UserRole.ADMIN)
  const canUseApiTokens = Boolean(apiTokenPermissions?.allowed) && !apiTokenPermissions?.isAdmin

  const role = authUser?.role

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
      ...(role && [UserRole.ADMIN, UserRole.EDITOR].includes(role) ? adminNavigation(t, role !== UserRole.ADMIN) : []),
    ],
    [role, canUseApiTokens, t],
  )

  return (
    <ThemeShell className="flex min-h-full flex-1 flex-col">
      <Sidebar navigation={isLoading || !isFetched ? [] : navigation}>{children}</Sidebar>
    </ThemeShell>
  )
}
