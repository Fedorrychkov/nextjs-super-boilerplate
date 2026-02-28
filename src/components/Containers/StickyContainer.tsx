import { forwardRef } from 'react'

import { cn } from '~/utils/cn'

type Props = {
  children: React.ReactNode
  className?: string
  direction?: 'top' | 'bottom'
  isEnabled?: boolean
}

export const StickyContainer = forwardRef<HTMLDivElement, Props>(({ isEnabled = true, children, className, direction = 'bottom' }, ref) => {
  if (!isEnabled) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className={cn(
        'bg-white z-10 after:content-[""] after:absolute after:z-1 after:right-0 after:left-0 after:w-full after:h-[20px] after:[background:linear-gradient(0deg,rgba(255,255,255,0.00)_0%,#FFF_100%)]',
        {
          'after:bottom-0 after:translate-y-full': direction === 'bottom',
          'after:top-0 after:-translate-y-full after:rotate-180': direction === 'top',
        },
        className,
      )}
    >
      {children}
    </div>
  )
})

StickyContainer.displayName = 'StickyContainer'
