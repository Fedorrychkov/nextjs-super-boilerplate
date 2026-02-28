'use server'

import { defaultGuard, PageProps } from '@lib/page'

const ProfileRoot = async (props: PageProps) => {
  await defaultGuard({ ...props, segments: ['profile'], fallbackNavigatePath: '/' })

  return (
    <div className="w-full h-full flex justify-center flex-col flex-1">
      Profile
    </div>
  )
}

export default ProfileRoot
