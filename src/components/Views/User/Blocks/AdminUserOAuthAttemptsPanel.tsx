'use client'

import { OAuthAttemptsListScreen } from '~/components/Views/OAuthAttempts/Screen/OAuthAttemptsListScreen'

type Props = {
  userId: string
}

export const AdminUserOAuthAttemptsPanel = ({ userId }: Props) => {
  return <OAuthAttemptsListScreen forcedUserId={userId} titleKey="oauthAttempts.userTitle" />
}
