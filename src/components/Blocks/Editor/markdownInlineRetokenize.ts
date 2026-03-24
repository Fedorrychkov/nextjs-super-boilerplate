import { Lexer } from 'marked'

/** Align with @tiptap/markdown Markdown.configure({ markedOptions: { gfm: true } }) */
const MARKED_INLINE_OPTIONS = { gfm: true } as const

/**
 * When marked gives paragraph/heading `text` but empty `tokens`, TipTap's parseInline([])
 * is empty. Re-run marked's inline lexer on `text` so **bold**, `code`, etc. become proper tokens.
 */
export function markedInlineTokensForTiptap(text: string) {
  return Lexer.lexInline(text.trim(), MARKED_INLINE_OPTIONS)
}
