import type { ReactNode } from 'react'

import { cn } from '~/utils/cn'

import { Typography } from './Typography'

type PageShellProps = {
  title: string
  description?: ReactNode
  /** Buttons on the right of the title (wrap under it on a phone). */
  actions?: ReactNode
  children: ReactNode
  /** `wide` for tables, `narrow` for forms and settings. */
  width?: 'narrow' | 'default' | 'wide'
  className?: string
}

const WIDTH = { narrow: 'max-w-3xl', default: 'max-w-5xl', wide: 'max-w-7xl' } as const

/** One frame for cabinet pages: title, a line about what the page is for, actions, content. */
export const PageShell = ({ title, description, actions, children, width = 'default', className }: PageShellProps) => (
  <div className={cn('flex w-full flex-col gap-6', WIDTH[width], className)}>
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <Typography variant="heading-2" asTag="h1">
          {title}
        </Typography>
        {description && (
          <Typography variant="Body/S/Regular" className="text-muted-foreground">
            {description}
          </Typography>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
    {children}
  </div>
)
