import { ClientUserApi, UserFilter, UserModel } from '~/api/user'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'
import { PaginationMeta } from '~/types'
import { jsonStringifySafety } from '~/utils/jsonSafe'

export const USER_LIST_QUERY_KEY = 'users-list'

export const fetchUsers = (filter: Partial<UserFilter>) => async (): Promise<PaginationMeta<UserModel>> => {
  const api = new ClientUserApi()

  return api.getUsers(filter)
}

export const useUsersListQuery = (filter: Partial<UserFilter>, enabled = true, onSuccess?: (data: PaginationMeta<UserModel>) => void) => {
  const props = useQueryBuilder({
    key: [USER_LIST_QUERY_KEY, jsonStringifySafety(filter)].join('-'),
    enabled,
    method: fetchUsers(filter),
    options: {
      onSuccess: (data) => {
        onSuccess?.(data)
      },
    },
  })

  return props
}
