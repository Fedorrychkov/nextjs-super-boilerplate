'use client'

import { InfoIcon } from 'lucide-react'
import { ReactNode } from 'react'

import { useSwitch } from '~/hooks/useSwitch'
import { cn } from '~/utils/cn'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui'

type Props = {
  children: ReactNode
  content: ReactNode
  enableInfoIcon?: boolean
  className?: string
}

export const CustomTooltip = (props: Props) => {
  const { children, content, enableInfoIcon = false, className } = props
  const [open, { toggle: toggleOpen }] = useSwitch(false)

  return (
    <>
      <div
        className={cn('block', className, {
          'hidden md:block': enableInfoIcon,
        })}
      >
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
      </div>
      <div
        className={cn('hidden', className, {
          'block md:hidden': enableInfoIcon,
        })}
      >
        <Dialog open={open} onOpenChange={toggleOpen}>
          <DialogTrigger asChild>
            {enableInfoIcon ? (
              <div className={cn('flex flex-row gap-2 items-start justify-start max-w-fit', className)}>
                {children}
                <InfoIcon className="w-4 h-4 text-gray-500 shrink-0" />
              </div>
            ) : (
              <div>{children}</div>
            )}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="sr-only">Info</DialogTitle>
              <DialogDescription className="sr-only">Tooltip</DialogDescription>
            </DialogHeader>
            {content}
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
