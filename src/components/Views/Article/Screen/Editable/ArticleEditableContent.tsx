'use client'

import type { Editor } from '@tiptap/core'
import { useCallback, useMemo } from 'react'

import { ArticleRevisionModel } from '~/api/article-revision'
import { DefaultEditor } from '~/components/Blocks/Editor/DefaultEditor'
import { useDefaultEditor } from '~/components/Blocks/Editor/hooks/useDefaultEditor'
import { MarkdownEditor } from '~/components/Blocks/Editor/MarkdownEditor'
import { AlertBlock, Button, Typography } from '~/components/ui'
import { cn } from '~/utils/cn'
import { jsonParseSafety } from '~/utils/jsonSafe'

import { DEFAULT_EXAMPLE } from './example'

type Props = {
  className?: string
  title?: string | null
  onUpdate?: (editor: Editor) => void
  articleRevision?: ArticleRevisionModel | null
  isDisabled?: boolean
}

export const ArticleEditableContent = (props: Props) => {
  const { className = '', title = 'Content Editor', onUpdate, articleRevision, isDisabled } = props

  const defaultContent = useMemo(() => {
    return articleRevision?.content ? jsonParseSafety<string>(articleRevision.content) : ''
  }, [articleRevision])

  const { editor, mode, handleSetMode, markdownInput, setMarkdownInput } = useDefaultEditor({ isDisabled, defaultContent, limit: 50_000, onUpdate })

  const handleSave = useCallback(() => {
    if (mode === 'markdown') {
      handleSetMode('default')()
    }
  }, [mode, handleSetMode])

  const handleSetExample = useCallback(() => {
    editor?.commands.setContent(DEFAULT_EXAMPLE)
  }, [editor])

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <Typography variant="heading-3">{title}</Typography>
      <div className="flex flex-row gap-3 flex-wrap">
        <Button variant={mode === 'default' ? 'default' : 'secondary'} size="sm-md" onClick={handleSetMode('default')}>
          Text Editor
        </Button>
        <Button variant={mode === 'markdown' ? 'default' : 'secondary'} size="sm-md" onClick={handleSetMode('markdown')}>
          Markdown Editor
        </Button>
        {mode === 'default' && (
          <Button variant="outline" size="sm-md" onClick={handleSetExample} disabled={isDisabled}>
            Set Example
          </Button>
        )}
      </div>
      {mode === 'markdown' && <AlertBlock notify={{ type: 'info', message: 'Markdown mode is not supported auto save, please save manually' }} />}
      <div
        className={cn({
          hidden: mode === 'markdown',
        })}
      >
        <DefaultEditor editor={editor} limit={50_000} />
      </div>
      {mode === 'markdown' && <MarkdownEditor isDisabled={isDisabled} value={markdownInput} editor={editor} onChange={setMarkdownInput} limit={50_000} />}
      <div>
        <Button variant="secondary" size="default" onClick={handleSave} disabled={isDisabled}>
          Save
        </Button>
      </div>
    </div>
  )
}
