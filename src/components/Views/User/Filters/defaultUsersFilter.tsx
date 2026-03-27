import { SortBy, SortOrder, UserFilter, UserRole, UserStatus } from '~/api/user'
import type { FilterOption } from '~/types'

import { USER_ROLES_NAMES, USER_STATUS_NAMES, USERS_SORT_BY_NAMES, USERS_SORT_ORDER_NAMES } from '../paramNames'

export type DefaultUsersFiltersKeys = keyof Pick<UserFilter, 'role' | 'status' | 'sortBy' | 'sortOrder'>

export const DefaultUsersFilters: Record<DefaultUsersFiltersKeys, FilterOption> = {
  status: {
    value: null,
    options: Object.values(UserStatus).map((status) => ({
      value: status,
      label: USER_STATUS_NAMES[status],
      labelLocalizationKey: `user.statuses.${status}`,
    })),
  },
  role: {
    value: null,
    options: Object.values(UserRole).map((role) => ({
      value: role,
      label: USER_ROLES_NAMES[role],
      labelLocalizationKey: `user.roles.${role}`,
    })),
  },
  sortBy: {
    value: null,
    options: Object.values(SortBy).map((sortBy) => ({
      value: sortBy,
      label: USERS_SORT_BY_NAMES[sortBy],
      labelLocalizationKey: `user.fields.${sortBy}`,
    })),
  },
  sortOrder: {
    value: null,
    options: Object.values(SortOrder).map((sortOrder) => ({
      value: sortOrder,
      label: USERS_SORT_ORDER_NAMES[sortOrder],
      labelLocalizationKey: `common.sortOrderes.${sortOrder}`,
    })),
  },
}
