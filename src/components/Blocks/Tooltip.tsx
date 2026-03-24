import { InfoIcon } from 'lucide-react'
import { ReactNode } from 'react'

import { cn } from '~/utils/cn'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui'

type Props = {
  children: ReactNode
  content: ReactNode
  enableInfoIcon?: boolean
  className?: string
}

export const CustomTooltip = (props: Props) => {
  const { children, content, enableInfoIcon = false, className } = props

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {enableInfoIcon ? (
            <div className={cn('flex flex-row gap-2 items-start justify-start max-w-fit', className)}>
              {children}
              <InfoIcon className="w-4 h-4 text-gray-500 shrink-0" />
            </div>
          ) : (
            <div>{children}</div>
          )}
        </TooltipTrigger>
        <TooltipContent>{content}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
