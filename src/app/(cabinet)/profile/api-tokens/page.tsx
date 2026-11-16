import { API_TOKENS_CONFIG } from '@config/env'
import { defaultGuard, PageProps } from '@lib/page'
import { notFound } from 'next/navigation'

import { ApiTokensScreen } from '~/components/Views/ApiTokens/Screen/ApiTokensScreen'

/**
 * Self-service API tokens for non-admin roles.
 * Access is decided by the role policy (`/admin/api-tokens`), checked client-side via
 * `GET /api/v1/api-token/permissions` and enforced server-side on every token endpoint.
 */
const ProfileApiTokensPage = async (props: PageProps) => {
  if (!API_TOKENS_CONFIG.enabled) {
    notFound()
  }

  await defaultGuard({
    ...props,
    segments: ['profile', 'api-tokens'],
    fallbackNavigatePath: '/',
  })

  return (
    <div className="w-full h-full flex justify-center flex-col flex-1 gap-6">
      <ApiTokensScreen variant="user" />
    </div>
  )
}

export default ProfileApiTokensPage
