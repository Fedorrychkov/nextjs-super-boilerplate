import { Children, FC, ReactNode } from 'react'

import { UserRole } from '~/api/user'
import { useAuthRole } from '~/providers'

type Props = {
  children: ReactNode
  roles?: UserRole[] | null
}

export const ProtectedContainer: FC<Props> = ({ children, roles }) => {
  const isValidAccess = useAuthRole(roles)

  if (isValidAccess) {
    const arrayChildren = Children.toArray(children)

    return <>{Children.map(arrayChildren, (child) => child)}</>
  }

  return null
}
