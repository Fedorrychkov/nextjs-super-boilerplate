import { defaultGuard, PageProps } from '@lib/page'

import { UserRole } from '~/api/user'
import { I18nTranslationsScreen } from '~/components/Views/I18n/Screen/I18nTranslationsScreen'

const I18nDashboardPage = async (props: PageProps) => {
  await defaultGuard({
    ...props,
    segments: ['admin', 'i18n'],
    fallbackNavigatePath: '/',
    roles: [UserRole.ADMIN, UserRole.EDITOR],
    fallbackRolesNavigatePath: { [UserRole.USER]: '/' },
  })

  return (
    <div className="w-full h-full flex justify-center flex-col flex-1 gap-6">
      <I18nTranslationsScreen />
    </div>
  )
}

export default I18nDashboardPage
