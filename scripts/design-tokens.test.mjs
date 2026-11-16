import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { HEADER, renderTokensCss, validateTokens } from './design-tokens.mjs'

describe('design tokens', () => {
  it('renders :root from light and .dark from dark, in source order', () => {
    const css = renderTokensCss({ light: { background: 'oklch(1 0 0)', radius: '0.625rem' }, dark: { background: 'oklch(0.1 0 0)' } })

    assert.equal(css, `${HEADER}\n\n:root {\n  --background: oklch(1 0 0);\n  --radius: 0.625rem;\n}\n\n.dark {\n  --background: oklch(0.1 0 0);\n}\n`)
  })

  it('accepts a valid source', () => {
    assert.deepEqual(validateTokens({ light: { primary: 'oklch(0.5 0.2 264)', 'status-up': '#10b981' }, dark: { primary: '#fff' } }), [])
  })

  it('rejects a dark-only name: the light theme would leave it unset', () => {
    assert.match(validateTokens({ light: { primary: '#000' }, dark: { brand: '#fff' } }).join(), /dark\.brand/)
  })

  it('rejects names and values that would break the stylesheet', () => {
    const errors = validateTokens({ light: { Primary: '#000', ok: 'red; color: blue', empty: ' ' } })

    assert.equal(errors.length, 3)
  })

  it('rejects an empty light theme', () => {
    assert.match(validateTokens({ light: {}, dark: {} }).join(), /light/)
  })
})
