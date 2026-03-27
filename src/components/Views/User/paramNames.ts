import { SortBy, SortOrder, UserFilter, UserModel, UserRole, UserStatus } from '~/api/user'

export const USERS_PARAM_NAMES: Record<keyof UserModel & keyof Pick<UserFilter, 'sortBy' | 'sortOrder'>, string> = {
  id: 'ID',
  role: 'user.fields.role',
  status: 'user.fields.status',
  createdAt: 'user.fields.createdAt',
  updatedAt: 'user.fields.updatedAt',
  sortBy: 'user.fields.sortBy',
  sortOrder: 'user.fields.sortOrder',
}

export const USER_STATUS_NAMES: Record<Exclude<UserStatus, null>, string> = {
  [UserStatus.ACTIVE]: 'Active',
  [UserStatus.BLOCKED]: 'Blocked',
}

export const USER_ROLES_NAMES: Record<Exclude<UserRole, null>, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.USER]: 'User',
  [UserRole.EDITOR]: 'Editor',
}

export const USERS_SORT_BY_NAMES: Record<Exclude<SortBy, null>, string> = {
  [SortBy.CREATED_AT]: 'Created At',
  [SortBy.UPDATED_AT]: 'Updated At',
}

export const USERS_SORT_ORDER_NAMES: Record<Exclude<SortOrder, null>, string> = {
  [SortOrder.ASC]: 'Ascending',
  [SortOrder.DESC]: 'Descending',
}
