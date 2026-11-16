import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { alternateOgLocales, isoDate, toOgLocale } from './articleLanguage'

describe('articleLanguage', () => {
  it('maps locales to og:locale', () => {
    assert.equal(toOgLocale('ru'), 'ru_RU')
    assert.equal(toOgLocale('en'), 'en_US')
  })

  it('lists only the languages an article really has as og:locale:alternate', () => {
    assert.deepEqual(alternateOgLocales('ru', []), [])
    assert.deepEqual(alternateOgLocales('ru', ['ru']), [])
    assert.deepEqual(alternateOgLocales('ru', ['ru', 'en', 'x-default']), ['en_US'])
  })

  it('turns a Date or a string into ISO and rejects junk — never "[object Object]"', () => {
    const iso = '2026-10-17T16:49:48.248Z'

    assert.equal(isoDate(new Date(iso)), iso)
    assert.equal(isoDate(iso), iso)
    assert.equal(isoDate(null), undefined)
    assert.equal(isoDate(''), undefined)
    assert.equal(isoDate({}), undefined)
  })
})
