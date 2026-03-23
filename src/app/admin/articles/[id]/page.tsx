'use server'

import { defaultGuard, PageProps } from '@lib/page'

import { UserRole } from '~/api/user'
import { ArticleEditableEntry } from '~/components/Views/Article/Screen'

const ArticlesRoot = async (props: PageProps<{ id: string }>) => {
  await defaultGuard({
    ...props,
    segments: ['admin', 'articles', '[id]'],
    fallbackNavigatePath: '/',
    roles: [UserRole.ADMIN, UserRole.EDITOR],
    fallbackRolesNavigatePath: { [UserRole.USER]: '/' },
  })

  const { id } = await props.params
  const { revisionId, activeTab } = await props.searchParams

  return (
    <div className="w-full h-full flex justify-center flex-col flex-1 gap-6">
      <ArticleEditableEntry
        articleId={id}
        activeTab={typeof activeTab === 'string' ? activeTab : null}
        revisionId={typeof revisionId === 'string' ? revisionId : null}
      />
    </div>
  )
}

export default ArticlesRoot
