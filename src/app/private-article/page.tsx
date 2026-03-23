import { redirect } from 'next/navigation'

import { routes } from '~/constants'

export default function ArticlePage() {
  return redirect(`${routes.home.path}`)
}
