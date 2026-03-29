import type { MarkdownToken, MarkdownTokenizer } from '@tiptap/core'
import { mergeAttributes, Node } from '@tiptap/core'

const AUDIO_MARKDOWN_TOKEN = 'articleAudioEmbed'

export const articleAudioMarkdownTokenizer: MarkdownTokenizer = {
  name: AUDIO_MARKDOWN_TOKEN,
  level: 'block',
  start: (src) => src.search(/^\s*@audio\(/m),
  tokenize: (src) => {
    const m = /^\s*@audio\(\s*([^\s)]+)\s*\)/.exec(src)

    if (!m) {
      return undefined
    }

    const raw = m[0]
    const href = m[1]?.trim()

    if (!href) {
      return undefined
    }

    return { type: AUDIO_MARKDOWN_TOKEN, raw, href } as MarkdownToken
  },
}

/**
 * Block &lt;audio&gt; with optional media ids. Markdown: `@audio(/cdn/asset-id)` on its own line.
 */
export const ArticleAudio = Node.create({
  name: 'audio',
  markdownTokenName: AUDIO_MARKDOWN_TOKEN,

  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
      preload: { default: 'metadata' },
      assetId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-asset-id'),
        renderHTML: (attrs) => (attrs.assetId ? { 'data-asset-id': attrs.assetId } : {}),
      },
      resourceType: {
        default: 'audio',
        parseHTML: (el) => el.getAttribute('data-resource-type') || 'audio',
        renderHTML: (attrs) => (attrs.resourceType ? { 'data-resource-type': attrs.resourceType } : {}),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'audio[src]',
        getAttrs: (el) => {
          if (!(el instanceof HTMLAudioElement)) {
            return false
          }

          const src = el.getAttribute('src')

          if (!src) {
            return false
          }

          return {
            src,
            controls: el.hasAttribute('controls'),
            preload: el.getAttribute('preload') || 'metadata',
            assetId: el.getAttribute('data-asset-id'),
            resourceType: el.getAttribute('data-resource-type') || 'audio',
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    const controls = node.attrs.controls !== false
    const preload = (node.attrs.preload as string) || 'metadata'

    return [
      'div',
      { class: 'tiptap-article-audio' },
      [
        'audio',
        mergeAttributes(HTMLAttributes, {
          ...(controls ? { controls: '' } : {}),
          preload,
          playsinline: '',
        }),
      ],
    ]
  },

  parseMarkdown: (token, helpers) => {
    const t = token as MarkdownToken & { href?: string }

    return helpers.createNode('audio', {
      src: t.href,
      controls: true,
      preload: 'metadata',
    })
  },

  renderMarkdown: (node) => {
    const src = node.attrs?.src

    if (!src || typeof src !== 'string') {
      return ''
    }

    return `@audio(${src})`
  },

  markdownTokenizer: articleAudioMarkdownTokenizer,
})
