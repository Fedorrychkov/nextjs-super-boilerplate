import type { MarkdownToken, MarkdownTokenizer } from '@tiptap/core'
import { mergeAttributes, Node } from '@tiptap/core'

export type ArticleVideoAlign = 'left' | 'center' | 'right'

const VIDEO_MARKDOWN_TOKEN = 'articleVideoEmbed'

export const articleVideoMarkdownTokenizer: MarkdownTokenizer = {
  name: VIDEO_MARKDOWN_TOKEN,
  level: 'block',
  start: (src) => src.search(/^\s*@video\(/m),
  tokenize: (src) => {
    const m = /^\s*@video\(\s*([^\s|)]+)(?:\|\s*([^\s)]+))?\s*\)/.exec(src)

    if (!m) {
      return undefined
    }

    const raw = m[0]
    const href = m[1]?.trim()
    const poster = m[2]?.trim()

    if (!href) {
      return undefined
    }

    return { type: VIDEO_MARKDOWN_TOKEN, raw, href, poster: poster || undefined } as MarkdownToken
  },
}

/**
 * Block &lt;video&gt; with optional poster and caption. Markdown: `@video(src)` or `@video(src|posterUrl)`.
 */
export const ArticleVideo = Node.create({
  name: 'articleVideo',
  markdownTokenName: VIDEO_MARKDOWN_TOKEN,

  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      poster: { default: null },
      controls: { default: true },
      preload: { default: 'metadata' },
      align: { default: 'center' as ArticleVideoAlign },
      caption: { default: null },
      assetId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-asset-id'),
        renderHTML: (attrs) => (attrs.assetId ? { 'data-asset-id': attrs.assetId } : {}),
      },
      posterAssetId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-poster-asset-id'),
        renderHTML: (attrs) => (attrs.posterAssetId ? { 'data-poster-asset-id': attrs.posterAssetId } : {}),
      },
      resourceType: {
        default: 'video',
        parseHTML: (el) => el.getAttribute('data-resource-type') || 'video',
        renderHTML: (attrs) => (attrs.resourceType ? { 'data-resource-type': attrs.resourceType } : {}),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'figure.tiptap-article-video',
        priority: 101,
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) {
            return false
          }

          const video = element.querySelector('video')
          const src = video?.getAttribute('src')

          if (!video || !src) {
            return false
          }

          let align: ArticleVideoAlign = 'center'

          if (element.classList.contains('tiptap-article-video--left')) {
            align = 'left'
          } else if (element.classList.contains('tiptap-article-video--right')) {
            align = 'right'
          }

          const figcaption = element.querySelector('figcaption')

          return {
            src,
            poster: video.getAttribute('poster'),
            controls: video.hasAttribute('controls'),
            preload: video.getAttribute('preload') || 'metadata',
            align,
            caption: figcaption?.textContent?.trim() || null,
            assetId: video.getAttribute('data-asset-id'),
            posterAssetId: video.getAttribute('data-poster-asset-id'),
            resourceType: video.getAttribute('data-resource-type') || 'video',
          }
        },
      },
      {
        tag: 'video[src]',
        getAttrs: (el) => {
          if (!(el instanceof HTMLVideoElement)) {
            return false
          }

          const src = el.getAttribute('src')

          if (!src) {
            return false
          }

          return {
            src,
            poster: el.getAttribute('poster'),
            controls: el.hasAttribute('controls'),
            preload: el.getAttribute('preload') || 'metadata',
            align: 'center' as ArticleVideoAlign,
            caption: null,
            assetId: el.getAttribute('data-asset-id'),
            posterAssetId: el.getAttribute('data-poster-asset-id'),
            resourceType: el.getAttribute('data-resource-type') || 'video',
          }
        },
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const align = (node.attrs.align as ArticleVideoAlign) || 'center'
    const caption = node.attrs.caption as string | null
    const controls = node.attrs.controls !== false
    const preload = (node.attrs.preload as string) || 'metadata'
    const poster = node.attrs.poster as string | null

    const videoAttrs = mergeAttributes(HTMLAttributes, {
      ...(poster ? { poster } : {}),
      ...(controls ? { controls: '' } : {}),
      preload,
      playsinline: '',
    })

    const video: [string, Record<string, unknown>] = ['video', videoAttrs]

    if (caption) {
      return [
        'figure',
        { class: `tiptap-article-video tiptap-article-video--${align}` },
        video,
        ['figcaption', { class: 'tiptap-article-video__caption' }, caption],
      ]
    }

    return ['figure', { class: `tiptap-article-video tiptap-article-video--${align}` }, video]
  },

  parseMarkdown: (token, helpers) => {
    const t = token as MarkdownToken & { href?: string; poster?: string }

    return helpers.createNode('articleVideo', {
      src: t.href,
      poster: t.poster ?? null,
      controls: true,
      preload: 'metadata',
      align: 'center',
    })
  },

  renderMarkdown: (node) => {
    const src = node.attrs?.src
    const poster = node.attrs?.poster

    if (!src || typeof src !== 'string') {
      return ''
    }

    if (poster && typeof poster === 'string' && poster.length > 0) {
      return `@video(${src}|${poster})`
    }

    return `@video(${src})`
  },

  markdownTokenizer: articleVideoMarkdownTokenizer,
})
