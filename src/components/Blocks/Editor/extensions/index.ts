import type { Editor } from '@tiptap/core'
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

import { MediaResourceType } from '~/api/media'
import { DEFAULT_AUDIO_ACCEPT_MIME_TYPES, DEFAULT_IMAGE_ACCEPT_MIME_TYPES, DEFAULT_VIDEO_ACCEPT_MIME_TYPES } from '~/components/Fields/Input/media/constants'
import { isMediaFileWithinUploadLimit } from '~/constants/media-upload'
import { logger } from '~/utils/logger'

import { isAllowedHref } from '../link/linkPolicy'
import { uploadEditorMediaFile } from '../uploadEditorMedia'
import { ArticleAudio } from './articleAudio'
import { ArticleImage } from './articleImage'
import { ArticleVideo } from './articleVideo'
import { EditorTextAlign } from './editorTextAlign'
import { HeadingMarkdownBody } from './headingMarkdownBody'
import { OrderedListPlain } from './orderedListPlain'
import { ParagraphMarkdownBody } from './paragraphMarkdownBody'

const allowedMimeTypes: string[] = [...DEFAULT_IMAGE_ACCEPT_MIME_TYPES, ...DEFAULT_AUDIO_ACCEPT_MIME_TYPES, ...DEFAULT_VIDEO_ACCEPT_MIME_TYPES]

function resourceTypeForFile(file: File): MediaResourceType | null {
  if (file.type.startsWith('audio/')) {
    return MediaResourceType.AUDIO
  }

  if (file.type.startsWith('video/')) {
    return MediaResourceType.VIDEO
  }

  if (file.type.startsWith('image/')) {
    return MediaResourceType.IMAGE
  }

  return null
}

export type DefaultExtensionsOptions = {
  onMediaFileTooLarge?: (file: File) => void
}

async function insertUploadedMediaAt(currentEditor: Editor, pos: number, file: File, onMediaFileTooLarge?: (file: File) => void): Promise<void> {
  if (!isMediaFileWithinUploadLimit(file)) {
    onMediaFileTooLarge?.(file)

    return
  }

  const resourceType = resourceTypeForFile(file)

  if (!resourceType) {
    return
  }

  const uploaded = await uploadEditorMediaFile(file, resourceType)

  if (!uploaded) {
    return
  }

  const src = uploaded.proxyPath || uploaded.proxyUrl

  if (resourceType === MediaResourceType.IMAGE) {
    const base = (uploaded.proxyUrl || src).replace(/\/$/, '')

    currentEditor
      .chain()
      .insertContentAt(pos, {
        type: 'image',
        attrs: {
          src: `${base}/inline`,
          assetId: uploaded.assetId,
          resourceType: MediaResourceType.IMAGE,
        },
      })
      .focus()
      .run()

    return
  }

  if (resourceType === MediaResourceType.AUDIO) {
    currentEditor
      .chain()
      .insertContentAt(pos, {
        type: 'audio',
        attrs: {
          src,
          assetId: uploaded.assetId,
          resourceType: MediaResourceType.AUDIO,
          controls: true,
          preload: 'metadata',
        },
      })
      .focus()
      .run()

    return
  }

  if (resourceType === MediaResourceType.VIDEO) {
    currentEditor
      .chain()
      .insertContentAt(pos, {
        type: 'articleVideo',
        attrs: {
          src,
          assetId: uploaded.assetId,
          resourceType: MediaResourceType.VIDEO,
          controls: true,
          preload: 'metadata',
          align: 'center',
        },
      })
      .focus()
      .run()
  }
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

export const defaultExtensions = (limit?: number | null, options?: DefaultExtensionsOptions) => [
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
  ArticleAudio,
  ArticleVideo,
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
        void insertUploadedMediaAt(currentEditor, pos, file, options?.onMediaFileTooLarge).catch((error) => {
          logger.error(error)
        })
      })
    },
    onPaste: (currentEditor, files, htmlContent) => {
      files.forEach((file) => {
        if (htmlContent) {
          logger.debug(htmlContent)

          return false
        }

        void insertUploadedMediaAt(currentEditor, currentEditor.state.selection.anchor, file, options?.onMediaFileTooLarge).catch((error) => {
          logger.error(error)
        })
      })
    },
  }),
]
