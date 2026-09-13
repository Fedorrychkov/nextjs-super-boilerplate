export type FirstAdminDecision = 'bootstrap' | 'normal'

/**
 * The first-admin branch of public sign-up is alive only on a database with no ADMIN yet. Once
 * bootstrapped, the address from FIRST_ADMIN_LOGIN is an ordinary address and the password from
 * env is never compared again — so the public form can no longer answer "is this the admin's
 * email" or "is this the admin's password" (it used to: 403 for a wrong password, 400 "already
 * exists" for the right one).
 */
export function resolveFirstAdminBranch(input: { adminExists: boolean; emailMatches: boolean; passwordMatches: boolean }): FirstAdminDecision {
  if (input.adminExists) return 'normal'

  return input.emailMatches && input.passwordMatches ? 'bootstrap' : 'normal'
}
