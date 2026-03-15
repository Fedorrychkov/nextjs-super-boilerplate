'use server'

import { defaultGuard, PageProps } from '@lib/page'
import { getServerProfile } from '@lib/server-action/server-auth'

import { Typography } from '~/components/ui'
import { NotificationBlock } from '~/components/Views/Notification'
import { ProfileMfaBlock } from '~/components/Views/Profile/ProfileMfaBlock'

const ProfileRoot = async (props: PageProps) => {
  await defaultGuard({ ...props, segments: ['profile'], fallbackNavigatePath: '/' })

  const profile = await getServerProfile()

  if (!profile) {
    return (
      <div className="w-full h-full flex justify-center flex-col flex-1">
        <Typography variant="Body/L/Regular">Profile not found</Typography>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex justify-center flex-col flex-1 gap-6">
      <Typography variant="Body/L/Regular">{profile.email}</Typography>

      <NotificationBlock />

      <ProfileMfaBlock />
    </div>
  )
}

export default ProfileRoot
