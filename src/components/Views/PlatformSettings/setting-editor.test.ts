import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { draftOf, isDirty, valueOf } from './setting-editor'

describe('setting editor', () => {
  it('starts a row from the stored value, a secret always empty', () => {
    assert.equal(draftOf({ spec: { kind: 'boolean' }, value: true, secret: false }), true)
    assert.equal(draftOf({ spec: { kind: 'int', min: 1, max: 9 }, value: 7, secret: false }), '7')
    assert.equal(draftOf({ spec: { kind: 'textList', maxItems: 5, maxLength: 9 }, value: ['a', 'b'], secret: false }), 'a\nb')
    assert.equal(draftOf({ spec: { kind: 'text', maxLength: 9 }, value: null, secret: true }), '')
  })

  it('turns a draft into the value to send', () => {
    assert.equal(valueOf({ kind: 'int', min: 1, max: 9 }, ' 5 '), 5)
    assert.ok(Number.isNaN(valueOf({ kind: 'int', min: 1, max: 9 }, '') as number))
    assert.deepEqual(valueOf({ kind: 'textList', maxItems: 5, maxLength: 9 }, 'a\n\nb'), ['a', '', 'b'])
    assert.equal(valueOf({ kind: 'choice', options: ['x'] }, 'x'), 'x')
  })

  it('a secret is dirty once something is typed; others when the draft differs', () => {
    assert.equal(isDirty({ spec: { kind: 'text', maxLength: 9 }, value: null, secret: true }, ''), false)
    assert.equal(isDirty({ spec: { kind: 'text', maxLength: 9 }, value: null, secret: true }, 'k'), true)
    assert.equal(isDirty({ spec: { kind: 'boolean' }, value: true, secret: false }, true), false)
    assert.equal(isDirty({ spec: { kind: 'boolean' }, value: true, secret: false }, false), true)
  })
})
