import Blockquote from '@tiptap/extension-blockquote'
import Bold from '@tiptap/extension-bold'
import Code from '@tiptap/extension-code'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Document from '@tiptap/extension-document'
import FileHandler from '@tiptap/extension-file-handler'
import Highlight from '@tiptap/extension-highlight'
import Italic from '@tiptap/extension-italic'
import Link from '@tiptap/extension-link'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import Strike from '@tiptap/extension-strike'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { TableKit } from '@tiptap/extension-table'
import Text from '@tiptap/extension-text'
import { TextStyle } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import { CharacterCount } from '@tiptap/extensions'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'
import css from 'highlight.js/lib/languages/css'
import js from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import ts from 'highlight.js/lib/languages/typescript'
import html from 'highlight.js/lib/languages/xml'
import { all, createLowlight } from 'lowlight'

import { logger } from '~/utils/logger'

import { isAllowedHref } from '../link/linkPolicy'
import { ArticleImage } from './articleImage'
import { EditorTextAlign } from './editorTextAlign'
import { HeadingMarkdownBody } from './headingMarkdownBody'
import { OrderedListPlain } from './orderedListPlain'
import { ParagraphMarkdownBody } from './paragraphMarkdownBody'

const allowedMimeTypes: string[] = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

async function uploadImageFile(file: File): Promise<{ proxyUrl: string; assetId: string } | null> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('resourceType', 'image')

  const response = await fetch('/api/v1/media/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    logger.error('Failed to upload image', { status: response.status })

    return null
  }

  const data = (await response.json()) as { proxyUrl?: string; asset?: { id?: string } }

  if (!data.proxyUrl || !data.asset?.id) {
    return null
  }

  return { proxyUrl: data.proxyUrl, assetId: data.asset.id }
}

// create a lowlight instance with all languages loaded
const lowlight = createLowlight(all)

// This is only an example, all supported languages are already loaded above
// but you can also register only specific languages to reduce bundle-size
lowlight.register('html', html)
lowlight.register('json', json)
lowlight.register('css', css)
lowlight.register('js', js)
lowlight.register('ts', ts)

export const defaultExtensions = (limit?: number | null) => [
  StarterKit.configure({
    heading: false,
    link: false,
    paragraph: false,
    italic: false,
    bold: false,
    strike: false,
    underline: false,
    codeBlock: false,
    code: false,
    text: false,
    document: false,
    blockquote: false,
    /** see OrderedListPlain — without custom markdownTokenizer */
    orderedList: false,
  }),
  HeadingMarkdownBody.configure({
    levels: [1, 2, 3, 4, 5, 6],
  }),
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
  OrderedListPlain,
  ArticleImage.configure({ inline: false }),
  EditorTextAlign,
  TableKit,
  Text,
  Document,
  ParagraphMarkdownBody,
  Strike,
  Blockquote,
  Highlight.configure({ multicolor: true }),
  Italic,
  Bold,
  Subscript,
  Superscript,
  TextStyle,
  Underline,
  Code,
  CharacterCount.configure({ limit }),
  CodeBlockLowlight.configure({
    lowlight,
  }),
  Markdown.configure({
    // GFM closer to expected behavior of lists/tables during round-trip HTML ↔ markdown
    markedOptions: {
      gfm: true,
    },
  }),
  Link.configure({
    HTMLAttributes: {
      class: 'text-secondary-600 underline',
    },
    openOnClick: false,
    autolink: true,
    /** Built-in paste plugin disabled — custom handlePaste (selection + URL from clipboard) */
    linkOnPaste: false,
    defaultProtocol: 'https',
    protocols: ['http', 'https'],
    isAllowedUri: (url, ctx) => isAllowedHref(url, ctx),
    shouldAutoLink: (url) => {
      try {
        const parsedUrl = url.includes(':') ? new URL(url) : new URL(`https://${url}`)
        const disallowedDomains: string[] = []
        const domain = parsedUrl.hostname

        return !disallowedDomains.includes(domain)
      } catch {
        return false
      }
    },
  }),
  FileHandler.configure({
    allowedMimeTypes,
    onDrop: (currentEditor, files, pos) => {
      files.forEach((file) => {
        uploadImageFile(file)
          .then((uploaded) => {
            if (!uploaded) {
              return
            }

            currentEditor
              .chain()
              .insertContentAt(pos, {
                type: 'image',
                attrs: {
                  src: `${uploaded.proxyUrl}/inline`,
                  assetId: uploaded.assetId,
                  resourceType: 'image',
                },
              })
              .focus()
              .run()
          })
          .catch((error) => {
            logger.error(error)
          })
      })
    },
    onPaste: (currentEditor, files, htmlContent) => {
      files.forEach((file) => {
        if (htmlContent) {
          // if there is htmlContent, stop manual insertion & let other extensions handle insertion via inputRule
          // you could extract the pasted file from this url string and upload it to a server for example
          logger.debug(htmlContent)

          return false
        }

        uploadImageFile(file)
          .then((uploaded) => {
            if (!uploaded) {
              return
            }

            currentEditor
              .chain()
              .insertContentAt(currentEditor.state.selection.anchor, {
                type: 'image',
                attrs: {
                  src: `${uploaded.proxyUrl}/inline`,
                  assetId: uploaded.assetId,
                  resourceType: 'image',
                },
              })
              .focus()
              .run()
          })
          .catch((error) => {
            logger.error(error)
          })
      })
    },
  }),
]
