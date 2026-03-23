import type { EditorView } from '@tiptap/pm/view'
import { Editor, useEditor } from '@tiptap/react'
import { useCallback, useMemo, useState } from 'react'

import { useNotify } from '~/providers/notify'
import { Logger } from '~/utils/logger'

import { defaultExtensions } from '../extensions'
import { DEFAULT_LINK_URI_CTX, isAllowedHref, normalizeUrlForLink } from '../link/linkPolicy'

type Props = {
  defaultContent?: string | null
  limit?: number | null
  defaultMode?: 'default' | 'markdown'
  logger?: Logger
  onUpdate?: (editor: Editor) => void
}

export const useDefaultEditor = (props: Props) => {
  const { defaultContent = null, limit, defaultMode = 'default', logger: defaultLogger } = props

  const [markdownInput, setMarkdownInput] = useState<string | null>(null)
  const [mode, setMode] = useState<'default' | 'markdown'>(defaultMode)
  const { notify } = useNotify()

  const logger = useMemo(() => defaultLogger ?? new Logger(['useDefaultEditor', '[src/components/Blocks/Editor/hooks/useDefaultEditor.ts]']), [defaultLogger])
  const extensions = useMemo(() => defaultExtensions(limit), [limit])

  const editor = useEditor({
    extensions,
    content: defaultContent,
    // Don't render immediately on the server to avoid SSR issues
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      props.onUpdate?.(editor)
    },
    editorProps: {
      handlePaste: (view: EditorView, event: ClipboardEvent) => {
        const text = event.clipboardData?.getData('text/plain')?.trim()

        if (!text) {
          return false
        }

        const { from, to, empty } = view.state.selection

        if (empty) {
          return false
        }

        const href = normalizeUrlForLink(text)

        if (!href || !isAllowedHref(href, DEFAULT_LINK_URI_CTX)) {
          return false
        }

        const linkMark = view.state.schema.marks.link

        if (!linkMark) {
          return false
        }

        view.dispatch(view.state.tr.addMark(from, to, linkMark.create({ href })))
        event.preventDefault()

        return true
      },
    },
  })

  const parseMarkdown = useCallback(() => {
    if (!editor) {
      notify('Editor not available', 'destructive')

      return
    }

    const md = markdownInput ?? ''

    if (!editor.markdown) {
      notify('MarkdownManager недоступен', 'destructive')

      return
    }

    try {
      editor.commands.setContent(md, { contentType: 'markdown' })
    } catch (err) {
      logger.error(err)
      notify(`Error parsing markdown: ${err instanceof Error ? err.message : String(err)}`, 'destructive')
    }
  }, [editor, markdownInput, notify, logger])

  const getEditorAsMarkdown = useCallback(() => {
    if (!editor) {
      return ''
    }

    try {
      const markdown = editor.getMarkdown()

      return markdown
    } catch (error) {
      logger.error(error)

      return editor.getText()
    }
  }, [editor, logger])

  const handleSetMode = useCallback(
    (mode: 'default' | 'markdown') => () => {
      setMode(mode)

      if (mode === 'markdown') {
        const markdown = getEditorAsMarkdown()
        setMarkdownInput(markdown)
      } else {
        parseMarkdown()
      }
    },
    [getEditorAsMarkdown, parseMarkdown],
  )

  return {
    editor,
    limit,
    mode,
    handleSetMode,
    markdownInput,
    setMarkdownInput,
  }
}
