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

export const BottomNavigation = (props: Props) => {
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
    <nav className={cn('fixed bottom-0 left-0 right-0 px-4 py-1 flex justify-center items-center pb-safe', props?.className)}>
      <ul className="flex justify-between gap-2 bg-white rounded-lg shadow-md shadow-black/30">
        {props?.nav?.map((item) => (
          <li key={[item.url, item.title].join('-')}>
            <Link
              className={cn(
                'group flex flex-col text-muted-foreground justify-center items-center select-none gap-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:text-accent-foreground',
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
