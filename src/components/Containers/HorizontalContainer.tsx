'use client'

import { cn } from '~/utils/cn'

export const HorizontalContainer = ({ children, className, container = true }: { children: React.ReactNode; className?: string; container?: boolean }) => {
  return (
    <div
      className={cn(
        'space-y-4 p-4 border border-border rounded-lg bg-background shadow-sm overflow-x-auto',
        {
          container: container,
        },
        className,
      )}
    >
      {children}
    </div>
  )
}
