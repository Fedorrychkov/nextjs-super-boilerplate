'use client'

import { AlertCircleIcon, BadgeDollarSign, BellIcon, ChartLineIcon, MessageCircleIcon, UserCheckIcon, UserRoundIcon } from 'lucide-react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { Suspense } from 'react'

import { cn } from '~/utils/cn'
import { matchesPathname } from '~/utils/matchPath'

import { SpinnerScreen } from '../Loaders'
import { Typography } from '../ui'
import { NavItem } from './types'

type Props = {
  nav: NavItem[]
}

const SettingsNavigation = (props: Props) => {
  const { nav: definedNav } = props

  const pathname = usePathname()
  const { userId } = useParams<{ userId: string }>()

  const nav = definedNav?.map((item) => ({
    ...item,
    url: item?.url?.replace('[userId]', userId),
  }))

  return (
    <ul className="flex justify-start overflow-x-auto mx-[-8px] px-2 md:px-0 md:mx-0">
      {nav?.map((item) => {
        const isCurrent = matchesPathname(item.url, pathname)

        return (
          <li key={[item.url, item.title].join('-')}>
            <Link
              className={cn(
                'flex flex-row p-2 bg-slate-100/50 dark:bg-slate-900 justify-start items-center select-none gap-1 rounded-t-md leading-none no-underline outline-none transition-colors hover:text-accent-foreground',
                {
                  'text-accent-foreground pointer-events-none bg-slate-100': isCurrent,
                  'hover:translate-y-1.5 bg-slate-200/50 translate-y-1': !isCurrent,
                },
              )}
              href={item.url}
            >
              {item.icon}
              <div>
                <Typography
                  variant="Body/XS/Regular"
                  className={cn('text-xs', {
                    'font-semibold': isCurrent,
                  })}
                >
                  {item.title}
                </Typography>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

const nav = [
  { title: 'Профиль', url: '/admin/users/[userId]', icon: <UserRoundIcon width={16} height={16} /> },
  { title: 'Верификации', url: '/admin/users/[userId]/verification', icon: <UserCheckIcon width={16} height={16} /> },
  { title: 'Аналитика', url: '/admin/users/[userId]/analytics', icon: <ChartLineIcon width={16} height={16} /> },
  { title: 'Уведомления', url: '/admin/users/[userId]/notification', icon: <BellIcon width={16} height={16} /> },
  { title: 'Жалобы', url: '/admin/users/[userId]/reports', icon: <AlertCircleIcon width={16} height={16} /> },
  { title: 'Чаты', url: '/admin/users/[userId]/chats', icon: <MessageCircleIcon width={16} height={16} /> },
  { title: 'Подписки', url: '/admin/users/[userId]/subscription', icon: <BadgeDollarSign width={16} height={16} /> },
]

export const SettingsNavigationLazy = (props: Omit<Props, 'nav'>) => {
  return (
    <Suspense fallback={<SpinnerScreen />}>
      <SettingsNavigation nav={nav} {...props} />
    </Suspense>
  )
}
