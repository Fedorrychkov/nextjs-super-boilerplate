import { MarkdownToken } from '@tiptap/core'
import Heading from '@tiptap/extension-heading'

/** marked heading token may expose `text` while `tokens` is empty — default parseMarkdown then builds an empty heading. */
type MarkedHeadingToken = {
  depth?: number
  tokens?: MarkdownToken[]
  text?: string
}

export const HeadingMarkdownBody = Heading.extend({
  parseMarkdown: (token, helpers) => {
    const t = token as MarkedHeadingToken
    const level = t.depth || 1
    let content = helpers.parseInline(t.tokens || [])

    if ((!Array.isArray(content) || content.length === 0) && typeof t.text === 'string' && t.text.trim().length > 0) {
      content = [{ type: 'text', text: t.text.trim() }]
    }

    return helpers.createNode('heading', { level }, content)
  },
})
