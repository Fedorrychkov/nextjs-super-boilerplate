/**
 * Pure rules of the MFA login challenge, kept apart from the cache client so they can be tested
 * without infrastructure. A challenge is issued after a correct password and lives until the
 * second factor is verified — so it must be single-use and must not survive a brute force.
 */
export type LoginChallenge = {
  userId: string
  /** Wrong codes seen so far. */
  attempts: number
}

export const LOGIN_CHALLENGE_TTL_SECONDS = 5 * 60

/** Five wrong codes and the challenge dies: the user goes back to the password step. */
export const LOGIN_CHALLENGE_MAX_ATTEMPTS = 5

/** The challenge to store after a wrong code, or null when it has been used up. */
export function nextChallengeAfterFailure(challenge: LoginChallenge): LoginChallenge | null {
  const attempts = challenge.attempts + 1

  return attempts >= LOGIN_CHALLENGE_MAX_ATTEMPTS ? null : { ...challenge, attempts }
}
