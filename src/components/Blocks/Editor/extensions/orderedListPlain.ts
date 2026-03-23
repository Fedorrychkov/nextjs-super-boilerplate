import { OrderedList } from '@tiptap/extension-list'

/**
 * In custom markdownTokenizer the standard OrderedList has a custom `markdownTokenizer` (collectOrderedListItems + lexer),
 * which gives errors after the list (tail of the document, `---`, blockquote) during round-trip Markdown ↔ editor.
 * For BulletList there is no custom tokenizer — parsing goes through marked `list`.
 * Disables only the tokenizer; `parseMarkdown` / `renderMarkdown` remain from OrderedList.
 */
export const OrderedListPlain = OrderedList.extend({
  // false — disables custom tokenizer; type expects an object, see comment above
  // @ts-expect-error — намеренно не MarkdownTokenizer
  markdownTokenizer: false,
})
