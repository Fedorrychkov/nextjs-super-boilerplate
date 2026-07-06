import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { TableKit } from '@tiptap/extension-table'
import Underline from '@tiptap/extension-underline'
import { generateJSON } from '@tiptap/html/server'
import StarterKit from '@tiptap/starter-kit'
import { marked } from 'marked'

import { normalizeMarkdownForTiptap } from '../src/components/Blocks/Editor/markdownNormalize'

/**
 * Server-safe extension profile for parsing agent-provided content.
 * Rendering always goes through the app's sanitizer (`src/lib/sanitize/articleHtml.ts`),
 * so agent content is no more dangerous than human content.
 */
const extensions = [StarterKit, Underline, Highlight, Subscript, Superscript, Image, TaskList, TaskItem, TableKit.configure({ table: { resizable: false } })]

/**
 * Markdown → TipTap JSON string (the format `ArticleRevision.content` expects —
 * the editor saves `JSON.stringify(editor.getJSON())`).
 *
 * Media embeds: use standard markdown images `![alt](url)`. For video/audio the admin flow
 * is manual for now (upload to CDN → link), matching the editor's "insert by URL" mode.
 */
export function markdownToTiptapContent(markdown: string): string {
  const normalized = normalizeMarkdownForTiptap(markdown)
  const html = marked.parse(normalized, { gfm: true, async: false })
  const doc = generateJSON(html, extensions)

  return JSON.stringify(doc)
}
