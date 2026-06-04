import { BookIcon, HomeIcon } from 'lucide-react'

import { routes } from '~/constants'
import { getServerT } from '~/lib/i18n/getServerT'
import { ThemeShell } from '~/providers/theme'
import { cn } from '~/utils/cn'

import { HeaderNavigation } from '../Navigation'

const nav = [
  {
    title: 'Home',
    titleKey: 'navigation.home' as const,
    url: routes.home.path,
    icon: <HomeIcon />,
  },
  {
    title: 'Articles',
    titleKey: 'navigation.articles' as const,
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

export const PreviewUniversalLayout = async (props: Props) => {
  const { t } = await getServerT()
  const { children, content, className, isNavEnabled = false } = props

  return (
    <ThemeShell className={cn('relative flex flex-1 flex-col justify-center gap-6 [&_img]:max-h-full [&_img]:max-w-full', className)}>
      {isNavEnabled && (
        <div className="z-10 m-auto w-full max-w-3xl rounded-md bg-card top-0 left-0 right-0">
          <HeaderNavigation nav={nav?.map((item) => ({ ...item, title: t(item.titleKey) })) || []} className="border-0 m-0 py-4 px-2" />
        </div>
      )}
      <div className="flex min-h-screen flex-col items-center justify-center font-sans">
        <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between gap-4 rounded-md bg-card px-4 py-10 sm:items-start md:px-16">
          {children}
        </main>
        {content}
      </div>
    </ThemeShell>
  )
}
