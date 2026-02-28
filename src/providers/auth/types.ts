import { QueryObserverResult } from 'react-query'

import { UserModel, UserRole } from '~/api/user'

export type AuthContextType = {
  authUser: Pick<UserModel, 'id' | 'email' | 'role' | 'status'> | null
  isLoading: boolean
  isFetched: boolean
  isAdmin: boolean
  isClient: boolean
  role: UserRole | null | undefined
  refetch?: () => Promise<QueryObserverResult<Pick<UserModel, 'id' | 'email' | 'role' | 'status'>, unknown>>
}
