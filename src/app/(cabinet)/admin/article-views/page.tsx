import { defaultGuard, PageProps } from '@lib/page'

import { UserRole } from '~/api/user'
import { ArticleViewsDashboardScreen } from '~/components/Views/ArticleViews/ArticleViewsDashboardScreen'

const ArticleViewsPage = async (props: PageProps) => {
  await defaultGuard({
    ...props,
    segments: ['admin', 'article-views'],
    fallbackNavigatePath: '/',
    roles: [UserRole.ADMIN, UserRole.EDITOR],
    fallbackRolesNavigatePath: { [UserRole.USER]: '/' },
  })

  return (
    <div className="w-full h-full flex justify-center flex-col flex-1 gap-6">
      <ArticleViewsDashboardScreen />
    </div>
  )
}

export default ArticleViewsPage
