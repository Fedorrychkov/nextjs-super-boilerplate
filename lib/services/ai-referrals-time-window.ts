/** Shared date window for the dashboard and per-pathname detail (as in buildAiReferralsDashboard). */
export function getAiReferralTimeBounds(windowDays: number): { since: Date; until: Date } {
  const until = new Date()
  const since = new Date(until.getTime() - windowDays * 24 * 60 * 60 * 1000)

  return { since, until }
}
