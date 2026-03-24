'use client'

import dynamic from 'next/dynamic'

import { SpinnerScreen } from '~/components/Loaders'

import type { ArticleEditableEntryProps } from './ArticleEditableEntry'

const ArticleEditableEntryLazy = dynamic(() => import('./ArticleEditableEntry').then((m) => ({ default: m.ArticleEditableEntry })), {
  ssr: false,
  loading: () => <SpinnerScreen />,
})

export function ArticleEditableEntryDynamic(props: ArticleEditableEntryProps) {
  return <ArticleEditableEntryLazy {...props} />
}
