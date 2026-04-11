/** Единое окно дат для дашборда и детализации по pathname (как в buildAiReferralsDashboard). */
export function getAiReferralTimeBounds(windowDays: number): { since: Date; until: Date } {
  const until = new Date()
  const since = new Date(until.getTime() - windowDays * 24 * 60 * 60 * 1000)

  return { since, until }
}
