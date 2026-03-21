'use server'

import { defaultGuard, PageProps } from '@lib/page'

import { UserRole } from '~/api/user'
import { ArticleEditableScreen } from '~/components/Views/Article/Screen'

const ArticlesRoot = async (props: PageProps) => {
  await defaultGuard({
    ...props,
    segments: ['admin', 'articles', 'create'],
    fallbackNavigatePath: '/',
    roles: [UserRole.ADMIN, UserRole.EDITOR],
    fallbackRolesNavigatePath: { [UserRole.USER]: '/' },
  })

  /**
   * TODO: Добавить список статей (взять варианты таблицы фильтров и так далее из ui-kit и sapian-web)
   * Далее деталка создания статьи, где как только у нас появится какая либо мутация юзера - желательно создать драфт в бд
   * режим создания/редактирования - в процессе мутации полей постоянно вызывать драфт установки данных статьи
   * поля для сохранения драфта не делать обязательными - валидации обязательных лучше делать при желании ПУБЛИКАЦИИ или отложенной публикации (отложенный режим скорее всего делать не будем из-за сложности по крону)
   * Так же для публикации интегрировать вызовы индексинга
   */
  return (
    <div className="w-full h-full flex justify-center flex-col flex-1 gap-6">
      <ArticleEditableScreen title="Article Editor" />
    </div>
  )
}

export default ArticlesRoot
