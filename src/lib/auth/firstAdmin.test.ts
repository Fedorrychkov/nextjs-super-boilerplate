import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { resolveFirstAdminBranch } from './firstAdmin'

describe('resolveFirstAdminBranch', () => {
  it('bootstraps only on an empty database with the matching email and password', () => {
    assert.equal(resolveFirstAdminBranch({ adminExists: false, emailMatches: true, passwordMatches: true }), 'bootstrap')
  })

  it('never compares the env password once an ADMIN exists — the public form stops being an oracle', () => {
    assert.equal(resolveFirstAdminBranch({ adminExists: true, emailMatches: true, passwordMatches: true }), 'normal')
    assert.equal(resolveFirstAdminBranch({ adminExists: true, emailMatches: true, passwordMatches: false }), 'normal')
  })

  it('a wrong password or another address is the normal path, not an error', () => {
    assert.equal(resolveFirstAdminBranch({ adminExists: false, emailMatches: true, passwordMatches: false }), 'normal')
    assert.equal(resolveFirstAdminBranch({ adminExists: false, emailMatches: false, passwordMatches: false }), 'normal')
  })
})
