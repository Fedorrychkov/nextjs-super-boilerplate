import Blockquote from '@tiptap/extension-blockquote'
import Bold from '@tiptap/extension-bold'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Document from '@tiptap/extension-document'
import FileHandler from '@tiptap/extension-file-handler'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import Italic from '@tiptap/extension-italic'
import Link from '@tiptap/extension-link'
import { ListKit } from '@tiptap/extension-list'
import Paragraph from '@tiptap/extension-paragraph'
import Strike from '@tiptap/extension-strike'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { TableKit } from '@tiptap/extension-table'
import Text from '@tiptap/extension-text'
import { TextStyle } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import { CharacterCount } from '@tiptap/extensions'
import { Markdown } from '@tiptap/markdown'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import css from 'highlight.js/lib/languages/css'
import js from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import ts from 'highlight.js/lib/languages/typescript'
import html from 'highlight.js/lib/languages/xml'
import { all, createLowlight } from 'lowlight'

// create a lowlight instance with all languages loaded
const lowlight = createLowlight(all)

// This is only an example, all supported languages are already loaded above
// but you can also register only specific languages to reduce bundle-size
lowlight.register('html', html)
lowlight.register('json', json)
lowlight.register('css', css)
lowlight.register('js', js)
lowlight.register('ts', ts)

const allowedMimeTypes: string[] = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

type Props = {
  defaultContent?: string | null
  limit?: number | null
}

export const useDefaultEditor = (props: Props) => {
  const { defaultContent = null, limit } = props

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
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
        bulletList: false,
        orderedList: false,
        listKeymap: false,
        listItem: false,
      }),
      Image.configure({ inline: false }),
      TableKit,
      Text,
      Document,
      Paragraph,
      Strike,
      Blockquote,
      Highlight.configure({ multicolor: true }),
      Italic,
      Bold,
      Subscript,
      Superscript,
      TextStyle,
      Underline,
      CharacterCount.configure({ limit }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Markdown.configure({
        // GFM ближе к ожидаемому поведению списков/таблиц при round-trip HTML ↔ markdown
        markedOptions: {
          gfm: true,
        },
      }),
      ListKit,
      Link.configure({
        HTMLAttributes: {
          class: 'text-secondary-600 underline',
        },
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        protocols: ['http', 'https'],
        isAllowedUri: (url, ctx) => {
          try {
            // construct URL
            const parsedUrl = url.includes(':') ? new URL(url) : new URL(`${ctx.defaultProtocol}://${url}`)

            // use default validation
            if (!ctx.defaultValidate(parsedUrl.href)) {
              return false
            }

            // disallowed protocols
            const disallowedProtocols: string[] = ['ftp', 'file']
            const protocol = parsedUrl.protocol.replace(':', '')

            if (disallowedProtocols.includes(protocol)) {
              return false
            }

            // only allow protocols specified in ctx.protocols
            const allowedProtocols = ctx.protocols.map((p) => (typeof p === 'string' ? p : p.scheme))

            if (!allowedProtocols.includes(protocol)) {
              return false
            }

            // disallowed domains
            const disallowedDomains: string[] = []
            const domain = parsedUrl.hostname

            if (disallowedDomains.includes(domain)) {
              return false
            }

            // all checks have passed
            return true
          } catch {
            return false
          }
        },
        shouldAutoLink: (url) => {
          try {
            // construct URL
            const parsedUrl = url.includes(':') ? new URL(url) : new URL(`https://${url}`)

            // only auto-link if the domain is not in the disallowed list
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
            const fileReader = new FileReader()

            fileReader.readAsDataURL(file)
            fileReader.onload = () => {
              currentEditor
                .chain()
                .insertContentAt(pos, {
                  type: 'image',
                  attrs: {
                    src: fileReader.result,
                  },
                })
                .focus()
                .run()
            }
          })
        },
        onPaste: (currentEditor, files, htmlContent) => {
          files.forEach((file) => {
            if (htmlContent) {
              // if there is htmlContent, stop manual insertion & let other extensions handle insertion via inputRule
              // you could extract the pasted file from this url string and upload it to a server for example
              console.log(htmlContent)

              return false
            }

            const fileReader = new FileReader()

            fileReader.readAsDataURL(file)
            fileReader.onload = () => {
              currentEditor
                .chain()
                .insertContentAt(currentEditor.state.selection.anchor, {
                  type: 'image',
                  attrs: {
                    src: fileReader.result,
                  },
                })
                .focus()
                .run()
            }
          })
        },
      }),
    ],
    content: defaultContent,
    // Don't render immediately on the server to avoid SSR issues
    immediatelyRender: false,
  })

  return {
    editor,
  }
}
