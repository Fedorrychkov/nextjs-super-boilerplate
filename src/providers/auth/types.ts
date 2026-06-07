import { QueryObserverResult } from 'react-query'

import type { AuthUserSnapshot, UserRole } from '~/api/user'

export type AuthContextType = {
  authUser: AuthUserSnapshot | null
  isLoading: boolean
  isFetched: boolean
  isAdmin: boolean
  isClient: boolean
  role: UserRole | null | undefined
  refetch?: () => Promise<QueryObserverResult<AuthUserSnapshot, unknown>>
}
