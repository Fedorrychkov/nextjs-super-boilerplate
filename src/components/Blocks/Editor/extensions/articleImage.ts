import { mergeAttributes, ResizableNodeView } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import type { Node as PMNode } from '@tiptap/pm/model'
import type { Decoration, DecorationSource } from '@tiptap/pm/view'

export type ArticleImageAlign = 'left' | 'center' | 'right'
export type ArticleImageObjectFit = 'contain' | 'cover'

function parsePx(styleValue: string | undefined): number | null {
  if (!styleValue) {
    return null
  }

  const m = styleValue.match(/^(\d+(?:\.\d+)?)px$/)

  if (!m) {
    return null
  }

  const n = Number(m[1])

  return Number.isFinite(n) ? Math.round(n) : null
}

function applyFigureLayout(figure: HTMLElement, frame: HTMLElement, img: HTMLImageElement, node: PMNode) {
  const align = (node.attrs.align as ArticleImageAlign) || 'center'
  figure.className = `tiptap-article-image tiptap-article-image--${align}`

  const maxW = node.attrs.maxWidthPx as number | null | undefined
  const maxH = node.attrs.maxHeightPx as number | null | undefined
  const minWAttr = node.attrs.minWidthPx as number | null | undefined
  const minHAttr = node.attrs.minHeightPx as number | null | undefined

  frame.style.maxWidth = maxW != null && maxW > 0 ? `${maxW}px` : ''
  frame.style.maxHeight = maxH != null && maxH > 0 ? `${maxH}px` : ''
  frame.style.minWidth = minWAttr != null && minWAttr > 0 ? `${minWAttr}px` : ''
  frame.style.minHeight = minHAttr != null && minHAttr > 0 ? `${minHAttr}px` : ''

  const fit = (node.attrs.objectFit as ArticleImageObjectFit) || 'contain'
  img.style.objectFit = fit
}

/**
 * Article image: alt, caption, object-fit, alignment, min/max frame,
 * resize only by edges with preserving proportions (ResizableNodeView).
 */
export const ArticleImage = Image.extend({
  name: 'image',

  addOptions() {
    const parent = this.parent?.()

    return {
      ...(parent ?? {}),
      inline: parent?.inline ?? false,
      allowBase64: true,
      HTMLAttributes: parent?.HTMLAttributes ?? {},
      resize: {
        enabled: true,
        directions: ['top', 'right', 'bottom', 'left'] as const,
        minWidth: 64,
        minHeight: 64,
        alwaysPreserveAspectRatio: true,
      },
    }
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      caption: {
        default: null,
        parseHTML: () => null,
      },
      objectFit: {
        default: 'contain',
        parseHTML: (element) => {
          if (!(element instanceof HTMLElement)) {
            return 'contain'
          }

          const fit = element.style.objectFit as ArticleImageObjectFit

          return fit === 'cover' ? 'cover' : 'contain'
        },
      },
      align: {
        default: 'center',
        parseHTML: (element) => {
          if (!(element instanceof HTMLElement)) {
            return 'center'
          }

          const fig = element.closest('figure.tiptap-article-image')

          if (fig?.classList.contains('tiptap-article-image--left')) {
            return 'left'
          }

          if (fig?.classList.contains('tiptap-article-image--right')) {
            return 'right'
          }

          return 'center'
        },
      },
      maxWidthPx: {
        default: null,
        parseHTML: () => null,
      },
      maxHeightPx: {
        default: null,
        parseHTML: () => null,
      },
      minWidthPx: {
        default: null,
        parseHTML: () => null,
      },
      minHeightPx: {
        default: null,
        parseHTML: () => null,
      },
      assetId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-asset-id') || null,
        renderHTML: (attrs) => (attrs.assetId ? { 'data-asset-id': attrs.assetId } : {}),
      },
      resourceType: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-resource-type') || null,
        renderHTML: (attrs) => (attrs.resourceType ? { 'data-resource-type': attrs.resourceType } : {}),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'figure.tiptap-article-image',
        priority: 101,
        getAttrs: (element: HTMLElement) => {
          const img = element.querySelector('img')

          if (!img?.getAttribute('src')) {
            return false
          }

          const figcaption = element.querySelector('figcaption')
          const frame = element.querySelector('.tiptap-article-image__frame') as HTMLElement | null

          let align: ArticleImageAlign = 'center'

          if (element.classList.contains('tiptap-article-image--left')) {
            align = 'left'
          } else if (element.classList.contains('tiptap-article-image--right')) {
            align = 'right'
          }

          const w = img.getAttribute('width')
          const h = img.getAttribute('height')

          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt'),
            title: img.getAttribute('title'),
            width: w ? Number.parseInt(w, 10) : null,
            height: h ? Number.parseInt(h, 10) : null,
            caption: figcaption?.textContent?.trim() || null,
            objectFit: (img.style.objectFit as ArticleImageObjectFit) === 'cover' ? 'cover' : 'contain',
            align,
            maxWidthPx: frame ? parsePx(frame.style.maxWidth) : null,
            maxHeightPx: frame ? parsePx(frame.style.maxHeight) : null,
            minWidthPx: frame ? parsePx(frame.style.minWidth) : null,
            minHeightPx: frame ? parsePx(frame.style.minHeight) : null,
            assetId: img.getAttribute('data-asset-id') || null,
            resourceType: img.getAttribute('data-resource-type') || null,
          }
        },
      },
      {
        tag: this.options.allowBase64 ? 'img[src]' : 'img[src]:not([src^="data:"])',
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const caption = node.attrs.caption as string | null
    const align = (node.attrs.align as ArticleImageAlign) || 'center'
    const objectFit = (node.attrs.objectFit as ArticleImageObjectFit) || 'contain'
    const maxW = node.attrs.maxWidthPx as number | null | undefined
    const maxH = node.attrs.maxHeightPx as number | null | undefined

    const frameStyle: string[] = []

    if (maxW != null && maxW > 0) {
      frameStyle.push(`max-width:${maxW}px`)
    }

    if (maxH != null && maxH > 0) {
      frameStyle.push(`max-height:${maxH}px`)
    }

    const minW = node.attrs.minWidthPx as number | null | undefined
    const minH = node.attrs.minHeightPx as number | null | undefined

    if (minW != null && minW > 0) {
      frameStyle.push(`min-width:${minW}px`)
    }

    if (minH != null && minH > 0) {
      frameStyle.push(`min-height:${minH}px`)
    }

    const imgAttrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      style: `object-fit:${objectFit}`,
    })

    const frameAttrs: Record<string, string> = { class: 'tiptap-article-image__frame' }

    if (frameStyle.length) {
      frameAttrs.style = frameStyle.join(';')
    }

    const inner: [string, Record<string, string>, ['img', Record<string, unknown>]] = ['div', frameAttrs, ['img', imgAttrs]]

    if (caption) {
      return [
        'figure',
        { class: `tiptap-article-image tiptap-article-image--${align}` },
        inner,
        ['figcaption', { class: 'tiptap-article-image__caption' }, caption],
      ]
    }

    return ['figure', { class: `tiptap-article-image tiptap-article-image--${align}` }, inner]
  },

  addNodeView() {
    const resizeOpt = this.options.resize

    if (!resizeOpt || typeof resizeOpt !== 'object' || !resizeOpt.enabled || typeof document === 'undefined') {
      return null
    }

    const { directions, minWidth, minHeight, alwaysPreserveAspectRatio } = resizeOpt

    return ({ node, getPos, HTMLAttributes, editor }) => {
      const figure = document.createElement('figure')
      const frame = document.createElement('div')
      frame.className = 'tiptap-article-image__frame'
      const captionEl = document.createElement('figcaption')
      captionEl.className = 'tiptap-article-image__caption'

      const el = document.createElement('img')

      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        if (value != null) {
          switch (key) {
            case 'width':
            case 'height':
              break
            default:
              el.setAttribute(key, String(value))
          }
        }
      })

      el.src = HTMLAttributes.src || ''

      const minW = Math.max(minWidth ?? 64, (node.attrs.minWidthPx as number | null | undefined) ?? 0)
      const minH = Math.max(minHeight ?? 64, (node.attrs.minHeightPx as number | null | undefined) ?? 0)

      const maxW = node.attrs.maxWidthPx as number | null | undefined
      const maxH = node.attrs.maxHeightPx as number | null | undefined

      applyFigureLayout(figure, frame, el, node)

      const cap = (node.attrs.caption as string | null) || ''

      captionEl.textContent = cap
      captionEl.style.display = cap ? '' : 'none'

      const nodeViewInner = new ResizableNodeView({
        element: el,
        editor,
        node,
        getPos,
        onResize: (width, height) => {
          el.style.width = `${width}px`
          el.style.height = `${height}px`
        },
        onCommit: (width, height) => {
          const pos = getPos()

          if (pos === undefined) {
            return
          }

          editor.chain().setNodeSelection(pos).updateAttributes('image', { width, height }).run()
        },
        onUpdate: (updatedNode, _deco, _inner) => {
          if (updatedNode.type !== node.type) {
            return false
          }

          return true
        },
        options: {
          directions,
          min: { width: minW, height: minH },
          max:
            maxW != null || maxH != null
              ? {
                  width: maxW != null && maxW > 0 ? maxW : undefined,
                  height: maxH != null && maxH > 0 ? maxH : undefined,
                }
              : undefined,
          preserveAspectRatio: alwaysPreserveAspectRatio === true,
        },
      })

      frame.appendChild(nodeViewInner.dom)
      figure.appendChild(frame)
      figure.appendChild(captionEl)

      const inner = nodeViewInner

      return {
        dom: figure,
        contentDOM: null,

        update: (updatedNode: PMNode, decorations: readonly Decoration[], innerDecorations: DecorationSource) => {
          if (updatedNode.type !== node.type) {
            return false
          }

          const nextCap = (updatedNode.attrs.caption as string | null) || ''

          captionEl.textContent = nextCap
          captionEl.style.display = nextCap ? '' : 'none'

          applyFigureLayout(figure, frame, el, updatedNode)

          el.alt = updatedNode.attrs.alt ?? ''
          const t = updatedNode.attrs.title

          if (t) {
            el.title = t
          } else {
            el.removeAttribute('title')
          }

          if (updatedNode.attrs.src) {
            el.src = updatedNode.attrs.src as string
          }

          return inner.update(updatedNode, decorations, innerDecorations)
        },

        destroy: () => {
          inner.destroy()
        },

        selectNode: () => {
          figure.classList.add('ProseMirror-selectednode')
        },

        deselectNode: () => {
          figure.classList.remove('ProseMirror-selectednode')
        },
      }
    }
  },
})
