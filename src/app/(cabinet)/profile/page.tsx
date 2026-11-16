import { defaultGuard, PageProps } from '@lib/page'
import { getServerProfile } from '@lib/server-action/server-auth'
import { Suspense } from 'react'

import { Tab, TabsContainer } from '~/components/Blocks/Tabs/TabsContainer'
import { ThemeModeSelect } from '~/components/theme/ThemeModeSelect'
import { Typography } from '~/components/ui'
import { NotificationBlock } from '~/components/Views/Notification'
import { OnboardingCard } from '~/components/Views/Onboarding/OnboardingCard'
import { ConnectedAccountsSection } from '~/components/Views/Profile/ConnectedAccountsSection'
import { ProfileChangePasswordPanel } from '~/components/Views/Profile/ProfileChangePasswordPanel'
import { ProfileMfaBlock } from '~/components/Views/Profile/ProfileMfaBlock'
import { ProfileSetPasswordPanel } from '~/components/Views/Profile/ProfileSetPasswordPanel'
import { UserPushSubscriptionsSelfPanel } from '~/components/Views/User/Blocks/UserPushSubscriptionsSelfPanel'
import { UserSessionsPanel } from '~/components/Views/User/Blocks/UserSessionsPanel'
import { getServerT } from '~/lib/i18n/server'

const ProfileRoot = async (props: PageProps) => {
  const { t } = await getServerT()
  await defaultGuard({ ...props, segments: ['profile'], fallbackNavigatePath: '/' })

  const profile = await getServerProfile()

  if (!profile) {
    return (
      <div className="w-full h-full flex justify-center flex-col flex-1">
        <Typography variant="Body/L/Regular">{t('profile.errors.notFound')}</Typography>
      </div>
    )
  }

  const sp = await props.searchParams
  const activeTab = typeof sp.activeTab === 'string' ? sp.activeTab : 'main'

  const identityCard = (
    <div className="flex flex-col rounded-lg border bg-card p-4 space-y-4">
      <div className="flex flex-col gap-2">
        <Typography variant="Body/S/Semibold">{t('user.fields.email')}</Typography>
        <Typography variant="Body/XS/Regular">{profile.email}</Typography>
      </div>
      <div className="flex flex-col gap-2">
        <Typography variant="Body/S/Semibold">{t('user.fields.role')}</Typography>
        <Typography variant="Body/XS/Regular">{t(`user.roles.${profile.role}`)}</Typography>
      </div>
      <div className="flex flex-col gap-2">
        <Typography variant="Body/S/Semibold">{t('user.fields.status')}</Typography>
        <Typography variant="Body/XS/Regular">{t(`user.statuses.${profile.status}`)}</Typography>
      </div>
    </div>
  )

  const tabs: Tab[] = [
    {
      value: 'main',
      label: t('profile.tabs.main'),
      children: (
        <div className="flex flex-col gap-6">
          {identityCard}
          <div className="flex flex-col rounded-lg border bg-card p-4">
            <ThemeModeSelect />
          </div>
          <Suspense fallback={null}>
            <OnboardingCard />
          </Suspense>
        </div>
      ),
    },
    {
      value: 'devices',
      label: t('profile.tabs.devices'),
      children: (
        <div className="flex flex-col gap-6">
          <div id="profile-push">
            <NotificationBlock />
          </div>
          <UserPushSubscriptionsSelfPanel />
          <UserSessionsPanel />
        </div>
      ),
    },
    {
      value: 'security',
      label: t('profile.tabs.security'),
      children: (
        <div className="flex flex-col gap-6">
          <div id="profile-set-password">
            <Suspense fallback={null}>
              <ProfileSetPasswordPanel />
            </Suspense>
          </div>
          <ProfileChangePasswordPanel />
          <div id="profile-mfa">
            <ProfileMfaBlock />
          </div>
          <Suspense fallback={null}>
            <ConnectedAccountsSection />
          </Suspense>
        </div>
      ),
    },
  ]

  return (
    <div className="w-full h-full flex flex-col flex-1 gap-6">
      <TabsContainer tabs={tabs} activeTab={activeTab} mode="lazy" searchMutable />
    </div>
  )
}

export default ProfileRoot
