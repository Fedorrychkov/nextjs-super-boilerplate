import { API_TOKENS_CONFIG } from '@config/env'
import { defaultGuard, PageProps } from '@lib/page'
import { notFound } from 'next/navigation'

import { UserRole } from '~/api/user'
import { MachineAccessScreen } from '~/components/Views/MachineAccess/MachineAccessScreen'

/**
 * Admin oversight of machine access (PATs + OAuth/MCP connections): per-user usage,
 * token revocation and the per-user kill-switch.
 */
const AdminMachineAccessPage = async (props: PageProps) => {
  if (!API_TOKENS_CONFIG.enabled) {
    notFound()
  }

  await defaultGuard({
    ...props,
    segments: ['admin', 'machine-access'],
    roles: [UserRole.ADMIN],
    fallbackNavigatePath: '/',
  })

  return (
    <div className="w-full h-full flex flex-col flex-1 gap-6 md:px-8 px-1 py-4">
      <MachineAccessScreen />
    </div>
  )
}

export default AdminMachineAccessPage
