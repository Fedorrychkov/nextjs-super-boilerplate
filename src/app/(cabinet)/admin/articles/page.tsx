import { defaultGuard, PageProps } from '@lib/page'

import { UserRole } from '~/api/user'
import { ArticleListScreen } from '~/components/Views/Article/Screen'

const ArticlesRoot = async (props: PageProps) => {
  await defaultGuard({
    ...props,
    segments: ['admin', 'articles'],
    fallbackNavigatePath: '/',
    roles: [UserRole.ADMIN, UserRole.EDITOR],
    fallbackRolesNavigatePath: { [UserRole.USER]: '/' },
  })

  return (
    <div className="w-full h-full flex justify-center flex-col flex-1 gap-6">
      <ArticleListScreen />
    </div>
  )
}

export default ArticlesRoot
