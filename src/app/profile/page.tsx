import { defaultGuard, PageProps } from '@lib/page'
import { getServerProfile } from '@lib/server-action/server-auth'
import { Suspense } from 'react'

import { ThemeModeSelect } from '~/components/theme/ThemeModeSelect'
import { Typography } from '~/components/ui'
import { NotificationBlock } from '~/components/Views/Notification'
import { OnboardingCard } from '~/components/Views/Onboarding/OnboardingCard'
import { ProfileChangePasswordPanel } from '~/components/Views/Profile/ProfileChangePasswordPanel'
import { ProfileMfaBlock } from '~/components/Views/Profile/ProfileMfaBlock'
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

  return (
    <div className="w-full h-full flex justify-center flex-col flex-1 gap-6">
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

      <div className="flex flex-col rounded-lg border bg-card p-4">
        <ThemeModeSelect />
      </div>

      <Suspense fallback={null}>
        <OnboardingCard />
      </Suspense>

      <div id="profile-notifications">
        <NotificationBlock />
      </div>

      <UserPushSubscriptionsSelfPanel />

      <UserSessionsPanel />

      <ProfileChangePasswordPanel />

      <div id="profile-mfa">
        <ProfileMfaBlock />
      </div>
    </div>
  )
}

export default ProfileRoot
