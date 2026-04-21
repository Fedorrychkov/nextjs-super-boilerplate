'use client'

import type { Editor } from '@tiptap/core'
import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react'

import { ArticleRevisionModel } from '~/api/article-revision'
import { DefaultEditor } from '~/components/Blocks/Editor/DefaultEditor'
import { useDefaultEditor } from '~/components/Blocks/Editor/hooks/useDefaultEditor'
import { MarkdownEditor } from '~/components/Blocks/Editor/MarkdownEditor'
import { AlertBlock, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Typography } from '~/components/ui'
import { useT } from '~/providers'
import { cn } from '~/utils/cn'
import { jsonParseSafety } from '~/utils/jsonSafe'

import { DEFAULT_EXAMPLE } from './example'

export type ArticleEditableContentHandle = {
  applyMarkdown: (markdown: string) => boolean
}

type Props = {
  className?: string
  title?: string | null
  onUpdate?: (editor: Editor) => void
  /** TipTap mode: advances the parent tab strip (preview tab is skipped in the parent). Markdown mode still uses Save to apply markdown. */
  onNext?: () => void
  articleRevision?: ArticleRevisionModel | null
  isDisabled?: boolean
}

export const ArticleEditableContent = forwardRef<ArticleEditableContentHandle, Props>(function ArticleEditableContent(props, ref) {
  const t = useT()
  const { className = '', title = t('article.ui.contentEditor'), onUpdate, onNext, articleRevision, isDisabled } = props
  const [exampleConfirmOpen, setExampleConfirmOpen] = useState(false)

  const defaultContent = useMemo(() => {
    return articleRevision?.content ? jsonParseSafety<string>(articleRevision.content) : ''
  }, [articleRevision])

  const { editor, mode, handleSetMode, setMode, markdownInput, setMarkdownInput, applyMarkdown } = useDefaultEditor({
    isDisabled,
    defaultContent,
    limit: 50_000,
    onUpdate,
  })

  useImperativeHandle(ref, () => ({ applyMarkdown }), [applyMarkdown])

  const handleSave = useCallback(() => {
    if (mode === 'markdown') {
      handleSetMode('default')()

      return
    }

    onNext?.()
  }, [mode, handleSetMode, onNext])

  const applyExample = useCallback(() => {
    editor?.commands.setContent(DEFAULT_EXAMPLE)
    setExampleConfirmOpen(false)
  }, [editor])

  const handleSetExample = useCallback(() => {
    if (!editor) {
      return
    }

    if (!editor.isEmpty) {
      setExampleConfirmOpen(true)

      return
    }

    applyExample()
  }, [editor, applyExample])

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <Typography variant="heading-3">{title}</Typography>
      <div className="flex flex-row gap-3 flex-wrap">
        <Button variant={mode === 'default' ? 'default' : 'secondary'} size="sm-md" onClick={() => setMode('default')}>
          {t('article.ui.textEditor')}
        </Button>
        <Button variant={mode === 'markdown' ? 'default' : 'secondary'} size="sm-md" onClick={handleSetMode('markdown')}>
          {t('article.ui.markdownEditor')}
        </Button>
        {mode === 'default' && (
          <Button variant="outline" size="sm-md" onClick={handleSetExample} disabled={isDisabled}>
            {t('article.ui.setExample')}
          </Button>
        )}
      </div>
      {mode === 'markdown' && <AlertBlock notify={{ type: 'info', message: t('article.ui.markdownModeNotSupportedAutoSave') }} />}
      <div
        className={cn({
          hidden: mode === 'markdown',
        })}
      >
        <DefaultEditor editor={editor} limit={50_000} articleId={articleRevision?.articleId ?? null} articleRevisionId={articleRevision?.id} />
      </div>
      {mode === 'markdown' && <MarkdownEditor isDisabled={isDisabled} value={markdownInput} editor={editor} onChange={setMarkdownInput} limit={50_000} />}
      <div>
        <Button variant="secondary" size="default" onClick={handleSave} disabled={isDisabled}>
          {mode === 'markdown' ? t('common.save') : t('common.next')}
        </Button>
      </div>

      <Dialog open={exampleConfirmOpen} onOpenChange={setExampleConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('article.ui.setExampleConfirmTitle')}</DialogTitle>
            <DialogDescription>{t('article.ui.setExampleConfirmDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setExampleConfirmOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" variant="default" onClick={applyExample}>
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
})
