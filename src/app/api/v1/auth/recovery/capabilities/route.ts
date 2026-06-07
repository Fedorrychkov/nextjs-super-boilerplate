import { apiErrorHandlerContainer, withGlobalRateLimit } from '@lib/middleware'
import { authMiddleware } from '@lib/security/auth'
import { getPublicRecoveryCapabilities, getUserRecoveryCapabilities } from '@lib/services/account-recovery.service'
import { NextRequest } from 'next/server'

const handler = (request: NextRequest) =>
  apiErrorHandlerContainer(request)(async (res) => {
    const authResult = await authMiddleware(request)

    if (authResult.success) {
      const capabilities = await getUserRecoveryCapabilities(authResult.payload.sub)

      return res.json(capabilities)
    }

    return res.json(getPublicRecoveryCapabilities())
  })

export const GET = withGlobalRateLimit(handler)
