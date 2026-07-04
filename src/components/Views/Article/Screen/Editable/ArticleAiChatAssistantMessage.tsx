'use client'

/* eslint-disable simple-import-sort/imports -- react, TipTap, editor SCSS, ~/ */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { CopyIcon } from 'lucide-react'

import { defaultExtensions } from '~/components/Blocks/Editor/extensions'
import { normalizeMarkdownForTiptap } from '~/components/Blocks/Editor/markdownNormalize'
import '~/components/Blocks/Editor/styles/editor.styles.scss'
import { Button, Textarea, Typography } from '~/components/ui'
import { useT } from '~/providers'
import { useNotify } from '~/providers/notify'
import { cn } from '~/utils/cn'
/* eslint-enable simple-import-sort/imports */

type Props = {
  content: string
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export const ArticleAiChatAssistantMessage = (props: Props) => {
  const { content } = props
  const t = useT()
  const { notify } = useNotify()
  const [mode, setMode] = useState<'default' | 'markdown'>('default')

  const extensions = useMemo(() => defaultExtensions(50_000), [])

  const editor = useEditor({
    extensions,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn('tiptap', 'readonly', 'max-w-none', 'text-sm', 'text-foreground', '[&_.ProseMirror]:min-h-[8rem]'),
      },
    },
  })

  useEffect(() => {
    if (!editor?.markdown) {
      return
    }

    const raw = content.trim()

    if (!raw) {
      editor.commands.clearContent()

      return
    }

    const md = normalizeMarkdownForTiptap(raw)

    try {
      editor.commands.setContent(md, { contentType: 'markdown' })
    } catch {
      try {
        editor.commands.setContent(`<Typography>${escapeHtml(raw)}</Typography>`)
      } catch {
        editor.commands.setContent('<Typography></Typography>')
      }
    }
  }, [editor, content])

  const handleCopyMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      notify(t('article.ui.aiCopied'), 'success')
    } catch {
      notify(t('article.ui.aiCopyFailed'), 'destructive')
    }
  }, [content, notify, t])

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-background/80 p-2">
      <div className="flex flex-row flex-wrap gap-2">
        <Button type="button" variant={mode === 'default' ? 'default' : 'secondary'} size="sm-md" onClick={() => setMode('default')}>
          {t('article.ui.textEditor')}
        </Button>
        <Button type="button" variant={mode === 'markdown' ? 'default' : 'secondary'} size="sm-md" onClick={() => setMode('markdown')}>
          {t('article.ui.markdownEditor')}
        </Button>
        {mode === 'markdown' ? (
          <Button type="button" variant="outline" size="sm-md" className="gap-1.5" onClick={() => void handleCopyMarkdown()} disabled={!content.trim()}>
            <CopyIcon className="size-3.5" />
            {t('article.ui.aiCopyMarkdown')}
          </Button>
        ) : null}
      </div>

      {mode === 'default' ? (
        <div className={cn('overflow-y-auto rounded-md border border-border/60 bg-muted/20 p-2')}>
          {!editor ? (
            <Typography variant="Body/S/Regular" className="text-muted-foreground">
              …
            </Typography>
          ) : (
            <EditorContent editor={editor} />
          )}
        </div>
      ) : (
        <Textarea readOnly value={content} className={cn('min-h-[12rem] max-h-[min(40vh,24rem)] resize-y font-mono text-sm')} spellCheck={false} />
      )}
    </div>
  )
}
