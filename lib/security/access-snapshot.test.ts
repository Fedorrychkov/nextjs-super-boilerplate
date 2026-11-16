import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { UserRole, UserStatus } from '~/api/user/model'

import { accessSnapshotKey, parseAccessSnapshot } from './access-snapshot'

describe('access snapshot', () => {
  it('keys a snapshot by user, session and generation', () => {
    assert.equal(accessSnapshotKey('u1', 's1', '3'), 'auth:access:u1:s1:3')
    assert.equal(accessSnapshotKey('u1', undefined, null), 'auth:access:u1:-:0')
    // A new generation is a different key: the old snapshot is never read again.
    assert.notEqual(accessSnapshotKey('u1', 's1', '3'), accessSnapshotKey('u1', 's1', '4'))
  })

  it('reads back only a complete snapshot', () => {
    const snap = { role: UserRole.ADMIN, status: UserStatus.ACTIVE, email: 'a@b.c' }

    assert.deepEqual(parseAccessSnapshot(JSON.stringify(snap)), snap)
    assert.equal(parseAccessSnapshot(null), null)
    assert.equal(parseAccessSnapshot('not json'), null)
    assert.equal(parseAccessSnapshot(JSON.stringify({ role: 'admin' })), null)
  })
})
