'use client'

import { UserRoundIcon } from 'lucide-react'
import Link from 'next/link'

import { useAuth } from '~/providers'

import { Typography } from '../ui'

type Props = {
  children?: React.ReactNode
}

export const Header = (props: Props) => {
  const { authUser } = useAuth()

  return (
    <header className="flex flex-col w-full px-4 py-2 pt-safe sticky top-0 left-0 bg-white z-50">
      {authUser && (
        <div className="flex flex-row justify-between gap-2 items-center">
          <Link className="flex gap-2 items-center" href="/settings/profile">
            <div className="bg-slate-200 rounded-full overflow-hidden text-slate-500">
              <UserRoundIcon className="w-[24px] h-[24px]" />
            </div>
            <Typography variant="Body/XS/Semibold">
              {authUser?.email?.split('@')[0]?.[0] ?? ''}***@{authUser?.email?.split('@')[1]}
            </Typography>
          </Link>
        </div>
      )}
      {props?.children ?? null}
    </header>
  )
}
