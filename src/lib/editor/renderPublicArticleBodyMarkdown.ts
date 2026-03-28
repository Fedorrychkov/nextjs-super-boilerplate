import type { JSONContent } from '@tiptap/core'
import { serializeChildrenToHTMLString } from '@tiptap/static-renderer/pm/html-string'
import { renderToMarkdown } from '@tiptap/static-renderer/pm/markdown'

import { defaultExtensions } from '~/components/Blocks/Editor/extensions'

/**
 * TipTap JSON → Markdown for public agent delivery (same extension stack as HTML render).
 * Custom blocks align with editor tokens (`@video`, `@audio`); task lists use GFM checkboxes.
 */
export function renderPublicArticleBodyMarkdown(content: JSONContent): string {
  const extensions = defaultExtensions()

  const body = renderToMarkdown({
    content,
    extensions,
    options: {
      nodeMapping: {
        heading({ node, children }) {
          const level = node.attrs.level as number
          const text = serializeChildrenToHTMLString(children).trim()

          return `${'#'.repeat(level)} ${text}\n`
        },
        taskList({ children }) {
          return `\n${serializeChildrenToHTMLString(children)}`
        },
        taskItem({ node, children }) {
          const checked = node.attrs.checked === true

          return `- [${checked ? 'x' : ' '}] ${serializeChildrenToHTMLString(children).trim()}\n`
        },
        articleVideo({ node }) {
          const src = node.attrs.src as string | null | undefined
          const poster = node.attrs.poster as string | null | undefined

          if (!src?.trim()) {
            return ''
          }

          if (poster?.trim()) {
            return `\n@video(${src.trim()}|${poster.trim()})\n`
          }

          return `\n@video(${src.trim()})\n`
        },
        audio({ node }) {
          const src = node.attrs.src as string | null | undefined

          if (!src?.trim()) {
            return ''
          }

          return `\n@audio(${src.trim()})\n`
        },
      },
    },
  })

  return typeof body === 'string' ? body.trimStart() : ''
}
