import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { UserRole } from '~/api/user/model'

import { canReadMediaAsset, isLibraryAsset } from './media-access'

const owner = { userId: 'u1', role: UserRole.USER }
const other = { userId: 'u2', role: UserRole.EDITOR }
const admin = { userId: 'u3', role: UserRole.ADMIN }

describe('canReadMediaAsset', () => {
  it('public and legacy (no visibility) assets are readable by any signed-in caller', () => {
    assert.equal(canReadMediaAsset({ visibility: 'public', createdBy: 'u1' }, other), true)
    assert.equal(canReadMediaAsset({ createdBy: null }, other), true)
  })

  it('a private asset is readable by the owner and by an admin, never by an editor', () => {
    const asset = { visibility: 'private', createdBy: 'u1' }

    assert.equal(canReadMediaAsset(asset, owner), true)
    assert.equal(canReadMediaAsset(asset, admin), true)
    assert.equal(canReadMediaAsset(asset, other), false)
  })

  it('a private asset without an owner is admin-only', () => {
    assert.equal(canReadMediaAsset({ visibility: 'private', createdBy: null }, owner), false)
    assert.equal(canReadMediaAsset({ visibility: 'private', createdBy: null }, admin), true)
  })
})

describe('isLibraryAsset', () => {
  it('cms and legacy documents belong to the library, user files do not', () => {
    assert.equal(isLibraryAsset({ purpose: 'cms' }), true)
    assert.equal(isLibraryAsset({}), true)
    assert.equal(isLibraryAsset({ purpose: null }), true)
    assert.equal(isLibraryAsset({ purpose: 'user' }), false)
  })
})
