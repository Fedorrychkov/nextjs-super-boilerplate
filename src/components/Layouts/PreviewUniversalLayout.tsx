import { BookIcon, HomeIcon } from 'lucide-react'

import { routes } from '~/constants'
import { cn } from '~/utils/cn'

import { HeaderNavigation } from '../Navigation'

const nav = [
  {
    title: 'Home',
    url: routes.home.path,
    icon: <HomeIcon />,
  },
  {
    title: 'Articles',
    url: routes.articlesPublic.path,
    icon: <BookIcon />,
  },
]

type Props = {
  children: React.ReactNode
  content?: React.ReactNode
  className?: string
  isNavEnabled?: boolean
}

export const PreviewUniversalLayout = (props: Props) => {
  const { children, content, className, isNavEnabled = false } = props

  return (
    <div
      className={cn(
        'w-full h-full flex justify-center flex-col flex-1 gap-6 [& img]:max-w-full [& img]:max-h-full relative dark:bg-black bg-zinc-50',
        className,
      )}
    >
      {isNavEnabled && (
        <div className="max-w-3xl w-full m-auto top-0 left-0 right-0 z-10 bg-white dark:bg-black rounded-md">
          <HeaderNavigation nav={nav} className="border-0 m-0 py-4 px-2" />
        </div>
      )}
      <div className="flex flex-col min-h-screen items-center justify-center font-sans">
        <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between bg-white md:px-16 px-4 py-32 dark:bg-black sm:items-start rounded-md">
          {children}
        </main>
        {content}
      </div>
    </div>
  )
}
