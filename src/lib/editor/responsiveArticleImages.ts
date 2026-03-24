const IMG_WITH_ASSET_REGEX = /<img\b([^>]*?)\bdata-asset-id=(["'])([^"']+)\2([^>]*)>/gi
const EMPTY_ATTR_VALUE_REGEX = /\s[a-zA-Z_:][-a-zA-Z0-9_:.]*=(["'])(?:null|undefined|NaN)?\1/gi
const TIPTAP_IMAGE_ATTRS_REGEX = /\s(?:caption|objectfit|align|maxwidthpx|maxheightpx|minwidthpx|minheightpx)=(["']).*?\1/gi
/** Align with `/cdn/...` variants: thumb ≈ 600px wide, inline ≈ 1600px wide */
const THUMB_DESCRIPTOR_W = 600
const INLINE_DESCRIPTOR_W = 1600
const IMG_SIZES = '(max-width: 1023px) 100vw, min(100vw, 1600px)'

export const makeArticleImagesResponsive = (html: string): string => {
  return html.replace(IMG_WITH_ASSET_REGEX, (_full, before, _quote, assetId, after) => {
    const attrs = `${before}${after}`
    const cleanedAttrs = attrs
      .replace(/\sdata-asset-id=(["']).*?\1/gi, '')
      .replace(/\sdata-resource-type=(["']).*?\1/gi, '')
      .replace(/\ssrc=(["']).*?\1/gi, '')
      .replace(/\ssizes=(["']).*?\1/gi, '')
      .replace(/\ssrcset=(["']).*?\1/gi, '')
      .replace(TIPTAP_IMAGE_ATTRS_REGEX, '')
      .replace(EMPTY_ATTR_VALUE_REGEX, '')
      .trim()

    const fallbackAttrs = cleanedAttrs ? ` ${cleanedAttrs}` : ''

    const thumb = `/cdn/${assetId}/thumb ${THUMB_DESCRIPTOR_W}w`
    const inline = `/cdn/${assetId}/inline ${INLINE_DESCRIPTOR_W}w`

    return [
      '<picture>',
      `<source srcset="${inline}" media="(min-width: 1024px)" />`,
      `<source srcset="${thumb}, ${inline}" media="(max-width: 1023px)" />`,
      `<img src="/cdn/${assetId}/inline" srcset="${thumb}, ${inline}" sizes="${IMG_SIZES}"${fallbackAttrs} loading="lazy" decoding="async" />`,
      '</picture>',
    ].join('')
  })
}
