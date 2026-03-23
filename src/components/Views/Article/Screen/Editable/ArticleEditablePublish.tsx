'use client'

import { ArticleModel } from '~/api/article'
import { ArticleRevisionModel } from '~/api/article-revision'
import { Button } from '~/components/ui'

type Props = {
  article?: ArticleModel | null
  articleRevision?: ArticleRevisionModel | null
  isLoading?: boolean
  btnLabel?: string
  isDisabled?: boolean
  onSave?: () => void
}

export const ArticleEditablePublish = (props: Props) => {
  const { btnLabel, onSave, isDisabled } = props

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button variant="secondary" size="default" onClick={onSave} disabled={isDisabled}>
          {btnLabel ?? 'Publish'}
        </Button>
      </div>
    </div>
  )
}
