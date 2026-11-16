import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { LOGIN_CHALLENGE_MAX_ATTEMPTS, nextChallengeAfterFailure } from './login-challenge-policy'

describe('nextChallengeAfterFailure', () => {
  it('counts wrong codes and keeps the user id', () => {
    const next = nextChallengeAfterFailure({ userId: 'u1', attempts: 0 })

    assert.deepEqual(next, { userId: 'u1', attempts: 1 })
  })

  it('kills the challenge on the fifth wrong code — the second factor is not brute-forceable', () => {
    let challenge = { userId: 'u1', attempts: 0 } as ReturnType<typeof nextChallengeAfterFailure>

    for (let i = 1; i < LOGIN_CHALLENGE_MAX_ATTEMPTS; i++) {
      challenge = nextChallengeAfterFailure(challenge!)
      assert.ok(challenge, `attempt ${i} should keep the challenge alive`)
    }

    assert.equal(nextChallengeAfterFailure(challenge!), null)
  })
})
