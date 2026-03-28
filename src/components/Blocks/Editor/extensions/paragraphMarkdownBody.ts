import { MarkdownToken } from '@tiptap/core'
import Paragraph from '@tiptap/extension-paragraph'

import { markedInlineTokensForTiptap } from '../markdownInlineRetokenize'

const EMPTY_PARAGRAPH_MARKDOWN = '&nbsp;'
const NBSP_CHAR = '\xA0'

/** marked paragraph can have empty `tokens` while `text` still holds the line — default parseInline then yields an empty paragraph (drops content after headings). */
type MarkedParagraphToken = {
  tokens?: Array<{ type?: string; [k: string]: unknown }>
  text?: string
}

export const ParagraphMarkdownBody = Paragraph.extend({
  parseMarkdown: (token, helpers) => {
    const tokens = token.tokens || []

    if (tokens.length === 1 && tokens[0].type === 'image') {
      return helpers.parseChildren([tokens[0]])
    }

    if (tokens.length === 1 && tokens[0].type === 'articleAudioEmbed') {
      return helpers.parseChildren([tokens[0]])
    }

    if (tokens.length === 1 && tokens[0].type === 'articleVideoEmbed') {
      return helpers.parseChildren([tokens[0]])
    }

    let content = helpers.parseInline(tokens)
    const t = token as MarkedParagraphToken

    if ((!Array.isArray(content) || content.length === 0) && typeof t.text === 'string' && t.text.trim().length > 0) {
      content = helpers.parseInline(markedInlineTokensForTiptap(t.text) as MarkdownToken[])
    }

    if ((!Array.isArray(content) || content.length === 0) && typeof t.text === 'string' && t.text.trim().length > 0) {
      content = [{ type: 'text', text: t.text.trim() }]
    }

    if (content.length === 1 && content[0].type === 'text' && (content[0].text === EMPTY_PARAGRAPH_MARKDOWN || content[0].text === NBSP_CHAR)) {
      return helpers.createNode('paragraph', undefined, [])
    }

    return helpers.createNode('paragraph', undefined, content)
  },
})
