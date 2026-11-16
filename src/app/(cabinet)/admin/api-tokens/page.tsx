import { API_TOKENS_CONFIG } from '@config/env'
import { defaultGuard, PageProps } from '@lib/page'
import { notFound } from 'next/navigation'

import { UserRole } from '~/api/user'
import { ApiTokensScreen } from '~/components/Views/ApiTokens/Screen/ApiTokensScreen'

const AdminApiTokensPage = async (props: PageProps) => {
  if (!API_TOKENS_CONFIG.enabled) {
    notFound()
  }

  await defaultGuard({
    ...props,
    segments: ['admin', 'api-tokens'],
    fallbackNavigatePath: '/',
    roles: [UserRole.ADMIN],
    fallbackRolesNavigatePath: { [UserRole.USER]: '/', [UserRole.EDITOR]: '/' },
  })

  return (
    <div className="w-full h-full flex justify-center flex-col flex-1 gap-6">
      <ApiTokensScreen />
    </div>
  )
}

export default AdminApiTokensPage
