import type { ReactNode } from 'react'

import { cn } from '~/utils/cn'

import { Typography } from './Typography'

type EmptyStateProps = {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

/** "Nothing here yet" with what to do next — instead of an empty table or a bare grey line. */
export const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => (
  <div className={cn('flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center', className)}>
    {icon && <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">{icon}</div>}
    <Typography variant="Body/M/Semibold">{title}</Typography>
    {description && (
      <Typography variant="Body/S/Regular" className="max-w-md text-muted-foreground">
        {description}
      </Typography>
    )}
    {action && <div className="mt-2">{action}</div>}
  </div>
)
