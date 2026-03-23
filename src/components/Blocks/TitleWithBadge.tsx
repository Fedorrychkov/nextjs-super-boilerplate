import { ReactNode } from 'react'

import { cn } from '~/utils/cn'

import { Badge, Typography } from '../ui'

type Props = {
  className?: string
  children?: ReactNode
  title?: string
  badgeContent?: ReactNode
}

export const TitleWithBadge = (props: Props) => {
  const { className, children = null, title = null, badgeContent = null } = props

  return (
    <div className={cn('flex flex-row items-center gap-2 relative', className)}>
      {title && <Typography variant="heading-3">{title}</Typography>}
      {children ?? null}
      {badgeContent && (
        <Badge variant="secondary" className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2">
          {badgeContent}
        </Badge>
      )}
    </div>
  )
}
