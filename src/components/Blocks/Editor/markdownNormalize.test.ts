import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ensureBlankLineBeforeHeadingAfterListLine,
  flushLeftAtxHeadingLines,
  flushLeftThematicBreakLines,
  normalizeMarkdownForTiptap,
} from './markdownNormalize'

test('inserts blank line between task item and following ATX heading', () => {
  const input = '- [ ] one\n## Two'
  const out = ensureBlankLineBeforeHeadingAfterListLine(input)

  assert.equal(out, '- [ ] one\n\n## Two')
})

test('does not add extra blank line when already present', () => {
  const input = '- [ ] one\n\n## Two'
  const out = ensureBlankLineBeforeHeadingAfterListLine(input)

  assert.equal(out, input)
})

test('ordered list line then heading', () => {
  const input = '1. first\n## Second'
  const out = ensureBlankLineBeforeHeadingAfterListLine(input)

  assert.equal(out, '1. first\n\n## Second')
})

test('flushLeftThematicBreakLines removes indent before --- so hr is not nested under task', () => {
  const input = '- [ ] one\n  ---\n  ## Phase'
  const out = flushLeftThematicBreakLines(input)

  assert.equal(out, '- [ ] one\n---\n  ## Phase')
})

test('flushLeftAtxHeadingLines strips indent before ATX heading', () => {
  assert.equal(flushLeftAtxHeadingLines('  ## Phase'), '## Phase')
})

test('normalizeMarkdownForTiptap: --- then ## on next line gets blank line between', () => {
  const input = '---\n## Phase 1'
  const out = normalizeMarkdownForTiptap(input)

  assert.equal(out, '---\n\n## Phase 1')
})
