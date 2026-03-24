/**
 * TipTap task list uses a custom marked tokenizer + parseIndentedBlocks. Continuation
 * lines under a task item are dedented with slice(indentLevel + 2), which corrupts
 * flush `---` / `##` lines that were wrongly nested (indented) under the last task —
 * headings then parse as plain paragraph text (raw `##` in the editor).
 *
 * These helpers normalize markdown before `setContent(..., { contentType: 'markdown' })`.
 */

/** Lines that are only a thematic break (`---`, `***`, `___`) — strip leading indent so they are not treated as nested under a task item. */
export function flushLeftThematicBreakLines(md: string): string {
  return md.replace(/^[ \t]+(?=(?:-{3,}|\*{3,}|_{3,})[ \t]*$)/gm, '')
}

/** ATX headings must not be indented as list continuations; flush to column 0 (CommonMark allows ≤3 spaces — nested task output can still confuse the lexer). */
export function flushLeftAtxHeadingLines(md: string): string {
  return md.replace(/^[ \t]+(#{1,6}(?:[ \t]|$)[^\r\n]*)$/gm, '$1')
}

/**
 * If an ATX heading sits on the line immediately after a list line (single `\n`),
 * insert a blank line so the heading is a separate block.
 */
export function ensureBlankLineBeforeHeadingAfterListLine(md: string): string {
  let out = md

  out = out.replace(/^([ \t]*[-+*][ \t]+\[[ xX]\][^\r\n]*)\r?\n(#{1,6}(?:[ \t]|$)[^\r\n]*)$/gm, '$1\n\n$2')

  out = out.replace(/^([ \t]*[-+*][ \t]+(?!\[[ xX]\])[^\r\n]*)\r?\n(#{1,6}(?:[ \t]|$)[^\r\n]*)$/gm, '$1\n\n$2')

  out = out.replace(/^([ \t]*\d{1,9}[.)][ \t]+[^\r\n]+)\r?\n(#{1,6}(?:[ \t]|$)[^\r\n]*)$/gm, '$1\n\n$2')

  return out
}

/** Thematic break then ATX heading with only one newline — force a block boundary for marked. */
export function ensureBlankLineAfterThematicBreakBeforeAtxHeading(md: string): string {
  return md.replace(/^([\t ]*(?:-{3,}|\*{3,}|_{3,})[\t ]*)\r?\n(#{1,6}(?:[ \t]|$)[^\r\n]*)$/gm, '$1\n\n$2')
}

/** Last line of a task list immediately followed by `---` (no blank line) — break the list before the rule. */
export function ensureBlankLineBeforeThematicBreakAfterTaskLine(md: string): string {
  return md.replace(/^([ \t]*[-+*][ \t]+\[[ xX]\][^\r\n]*)\r?\n([\t ]*(?:-{3,}|\*{3,}|_{3,})[\t ]*)$/gm, '$1\n\n$2')
}

export function normalizeMarkdownForTiptap(md: string): string {
  let out = md
  out = flushLeftThematicBreakLines(out)
  out = flushLeftAtxHeadingLines(out)
  out = ensureBlankLineBeforeHeadingAfterListLine(out)
  out = ensureBlankLineBeforeThematicBreakAfterTaskLine(out)
  out = ensureBlankLineAfterThematicBreakBeforeAtxHeading(out)

  return out
}
