import React from 'react'

import { cn } from '~/utils/cn'

type Props = {
  children: React.ReactNode
  className?: string
}

export const Block = (props: Props) => {
  return <div className={cn('px-4 py-1', props?.className)}>{props.children}</div>
}
