'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '~/utils/cn'

import { Typography } from '../ui'
import { NavItem } from './types'

type Props = {
  nav: NavItem[]
  className?: string
}

export const HeaderNavigation = (props: Props) => {
  const pathname = usePathname()

  const matchesPathname = (path: string, pathname: string) => {
    if (path === '/' && pathname === '/') {
      return true
    }

    if (path === '/' && pathname !== '/') {
      return false
    }

    return pathname.startsWith(path)
  }

  if (!props?.nav?.length) return null

  return (
    <nav className={cn('py-1 flex justify-start items-center border-t border-slate-200 dark:border-slate-800 mt-2 pt-2', props?.className)}>
      <ul className="flex justify-between gap-4">
        {props?.nav?.map((item) => (
          <li key={[item.url, item.title].join('-')}>
            <Link
              className={cn(
                'group flex flex-row justify-start text-muted-foreground items-center select-none gap-1 rounded-md leading-none no-underline outline-none transition-colors hover:text-accent-foreground group-hover:text-accent-foreground',
                {
                  'text-accent-foreground': matchesPathname(item.url, pathname),
                },
              )}
              href={item.url}
            >
              {item.icon}
              <div>
                <Typography
                  variant="Body/XS/Regular"
                  className={cn('text-xs font-semibold text-muted-foreground group-hover:text-accent-foreground', {
                    'text-accent-foreground': matchesPathname(item.url, pathname),
                  })}
                >
                  {item.title}
                </Typography>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
