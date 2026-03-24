/**
 * During `next build` Next.js will prerender part of the routes; in Docker hosts
 * `mongo`/`redis` are often unavailable during the build phase — we do not try to connect to the DB.
 *
 * @see https://nextjs.org/docs/app/api-reference/next-config-js/env#next_phase
 */
export function shouldSkipDbDuringBuild(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build' || process.env.SKIP_DB_DURING_BUILD === '1'
}
