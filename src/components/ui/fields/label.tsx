'use client'

import * as React from 'react'

import { cn } from '~/utils/cn'

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement> & { isError?: boolean }>(
  ({ className, isError, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-sm font-medium leading-4 text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
        isError && 'text-destructive',
      )}
      {...props}
    />
  ),
)
Label.displayName = 'Label'

export { Label }
