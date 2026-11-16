import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import mongoose from 'mongoose'

import { userSearchCondition } from './user-search'

describe('userSearchCondition', () => {
  it('is no condition for empty or non-string input', () => {
    assert.equal(userSearchCondition(''), null)
    assert.equal(userSearchCondition('   '), null)
    assert.equal(userSearchCondition(undefined), null)
    assert.equal(userSearchCondition(['a']), null)
  })

  it('matches a part of the email, case-insensitive', () => {
    assert.deepEqual(userSearchCondition(' Ann@Ex '), { email: { $regex: 'ann@ex', $options: 'i' } })
  })

  it('escapes regex syntax: typed characters are literals', () => {
    const condition = userSearchCondition('a.b*(c)') as { email: { $regex: string } }

    assert.equal(condition.email.$regex, 'a\\.b\\*\\(c\\)')
    assert.ok(new RegExp(condition.email.$regex, 'i').test('a.b*(c)@x.io'))
    assert.ok(!new RegExp(condition.email.$regex, 'i').test('axbbbc@x.io'))
  })

  it('also matches the exact account id', () => {
    const id = new mongoose.Types.ObjectId().toString()
    const condition = userSearchCondition(id) as { $or: [{ _id: mongoose.Types.ObjectId }, unknown] }

    assert.equal(condition.$or[0]._id.toString(), id)
  })

  it('caps the length', () => {
    const condition = userSearchCondition('x'.repeat(500)) as { email: { $regex: string } }

    assert.equal(condition.email.$regex.length, 100)
  })
})
