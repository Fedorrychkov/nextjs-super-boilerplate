import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { PLATFORM_SETTINGS } from '@config/platform-settings'

import { effectiveSettingValue, validateSettingValue } from './platform-settings-rules'

describe('validateSettingValue', () => {
  it('checks booleans and integers in range', () => {
    assert.deepEqual(validateSettingValue({ kind: 'boolean' }, true), { ok: true, value: true })
    assert.deepEqual(validateSettingValue({ kind: 'boolean' }, 'true'), { ok: false, code: 'notBoolean' })
    assert.deepEqual(validateSettingValue({ kind: 'int', min: 7, max: 365 }, 30), { ok: true, value: 30 })
    assert.deepEqual(validateSettingValue({ kind: 'int', min: 7, max: 365 }, 3), { ok: false, code: 'outOfRange' })
    assert.deepEqual(validateSettingValue({ kind: 'int', min: 7, max: 365 }, 7.5), { ok: false, code: 'notInteger' })
  })

  it('accepts only listed choices', () => {
    const spec = { kind: 'choice', options: ['log', 'mongo'] } as const

    assert.deepEqual(validateSettingValue(spec, 'mongo'), { ok: true, value: 'mongo' })
    assert.deepEqual(validateSettingValue(spec, 'redis'), { ok: false, code: 'notAnOption' })
  })

  it('trims text, limits it and applies the pattern to a non-empty value only', () => {
    const spec = { kind: 'text', maxLength: 30, pattern: '^https://[^\\s/]+$' } as const

    assert.deepEqual(validateSettingValue(spec, '  https://eu.example.com '), { ok: true, value: 'https://eu.example.com' })
    assert.deepEqual(validateSettingValue(spec, 'http://insecure.example.com'), { ok: false, code: 'patternMismatch' })
    assert.deepEqual(validateSettingValue(spec, ''), { ok: true, value: '' })
    assert.deepEqual(validateSettingValue(spec, 'https://' + 'a'.repeat(40)), { ok: false, code: 'tooLong' })
  })

  it('cleans a text list and limits it', () => {
    const spec = { kind: 'textList', maxItems: 2, maxLength: 5 } as const

    assert.deepEqual(validateSettingValue(spec, [' a ', '', 'b']), { ok: true, value: ['a', 'b'] })
    assert.deepEqual(validateSettingValue(spec, ['a', 'b', 'c']), { ok: false, code: 'tooManyItems' })
    assert.deepEqual(validateSettingValue(spec, ['toolong']), { ok: false, code: 'itemTooLong' })
    assert.deepEqual(validateSettingValue(spec, 'a,b'), { ok: false, code: 'notList' })
  })
})

describe('effectiveSettingValue', () => {
  it('falls back to the default for a missing or no longer valid stored value', () => {
    const spec = { kind: 'int', min: 7, max: 365 } as const

    assert.equal(effectiveSettingValue(spec, 90, null), 90)
    assert.equal(effectiveSettingValue(spec, 90, 30), 30)
    assert.equal(effectiveSettingValue(spec, 90, 1000), 90)
  })
})

describe('the registry', () => {
  it('every default passes its own spec — a broken default would ship a broken product', () => {
    for (const [key, definition] of Object.entries(PLATFORM_SETTINGS)) {
      const checked = validateSettingValue(definition.spec, definition.defaultValue)

      assert.equal(checked.ok, true, `${key}: default does not pass its spec`)
    }
  })
})
