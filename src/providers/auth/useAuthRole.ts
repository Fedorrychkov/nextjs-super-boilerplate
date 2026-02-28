'use client'

import isEmpty from 'lodash/isEmpty'
import { useMemo } from 'react'

import { UserRole } from '~/api/user'

import { useAuth } from './useAuth'

export const useAuthRole = (validationRoles?: UserRole[] | null) => {
  const { role } = useAuth()

  const isValidAccess = useMemo(() => {
    if (!role) return false

    if (!isEmpty(validationRoles) && validationRoles) {
      return validationRoles.includes(role)
    }

    return true
  }, [validationRoles, role])

  return { hasAccess: isValidAccess }
}
