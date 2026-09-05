// Тексты уведомлений в Telegram из событий GitHub. Чистые функции без сети, чтобы их можно было
// тестировать (format.test.mjs); отправка и чтение событий — в notify.mjs.
// Формат — HTML (parse_mode=HTML), поэтому всё динамическое проходит через esc(): трейлер вида
// `Co-Authored-By: Имя <почта>` иначе читается Telegram как тег, и Bot API отвечает 400
// «can't parse entities» — ровно так деплойное уведомление однажды промолчало.
//
// Три деплойных сообщения (старт / успех / ошибка) живут отдельно, в scripts/notify-telegram.sh,
// и этим модулем не затронуты.

export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const link = (text, url) => `<a href="${esc(url)}">${esc(text)}</a>`

/** Обрезка по символам, не по байтам: `slice` у строки JS считает кодовые единицы, кириллицу не рвёт. */
const cut = (s, n = 200) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

/** «Closes #48, fixes #12» из тела PR → ['#48', '#12'] */
export const closedIssues = (body) =>
  [...String(body ?? '').matchAll(/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi)].map((m) => `#${m[1]}`)

/** Все упоминания #N в тексте, без дублей: «см. #35», ссылки в списке «связано». */
export const mentionedIssues = (body) => [...new Set([...String(body ?? '').matchAll(/(?<![\w/])#(\d+)\b/g)].map((m) => `#${m[1]}`))]

const issueLinks = (issues, repoUrl) => issues.map((i) => link(i, `${repoUrl}/issues/${i.slice(1)}`)).join(', ')

/**
 * Строка «закрывает #48 · связано #35» со ссылками. Без issue в тексте — пустая строка,
 * сообщение от этого не ломается: задачи без issue бывают.
 */
export function issuesLine(body, repoUrl, self) {
  const closes = closedIssues(body)
  // Свой номер PR в тексте («см. PR #91») — не задача, выкидываем
  const refs = mentionedIssues(body).filter((i) => !closes.includes(i) && i !== `#${self}`)
  const parts = []
  if (closes.length) parts.push(`закрывает ${issueLinks(closes, repoUrl)}`)
  if (refs.length) parts.push(`связано ${issueLinks(refs, repoUrl)}`)
  return parts.join(' · ')
}

/** Хэштеги для поиска в чате: #pr #develop, #ci #main … Те же, что у деплойных: #stage, #error. */
const tags = (...xs) =>
  xs
    .filter(Boolean)
    .map((x) => `#${String(x).replace(/[^\w]+/g, '_')}`)
    .join(' ')

/** Цитата в том же виде, что у деплойных уведомлений: ветка, коммит, автор, текст. */
function quote({ branchName, branchUrl, base, commitSha, commitUrl, author, authorUrl, message }, limit = 800) {
  const lines = []
  if (branchName) lines.push(`🔄 Ветка: ${link(branchName, branchUrl)}${base ? ` → ${esc(base)}` : ''}`)
  if (commitSha) lines.push(`📝 Коммит: ${link(commitSha.slice(0, 7), commitUrl)}`)
  if (author) lines.push(`👤 Автор: ${authorUrl ? link(author, authorUrl) : esc(author)}`)
  const text = String(message ?? '').trim()
  if (text) lines.push(`💬 ${esc(cut(text, limit))}`)
  return lines.length ? `<blockquote>${lines.join('\n')}</blockquote>` : ''
}

const repoUrlOf = (pr) => pr.base?.repo?.html_url ?? pr.html_url.replace(/\/pull\/\d+$/, '')
const prLine = (pr) => `${link(`PR #${pr.number}`, pr.html_url)} ${esc(pr.title)}`
const labels = (pr) => (pr.labels ?? []).map((l) => l.name).join(', ')
const prQuote = (pr, extra = {}) =>
  quote({
    branchName: pr.head?.ref,
    branchUrl: `${repoUrlOf(pr)}/tree/${pr.head?.ref}`,
    base: pr.base?.ref,
    author: pr.user?.login,
    authorUrl: pr.user?.html_url,
    message: pr.body,
    ...extra,
  })

/**
 * События pull_request. Возвращает текст или null, если событие не стоит сообщения:
 * draft, закрыт без merge, push в открытый PR (synchronize).
 */
export function formatPullRequest(event) {
  const pr = event.pull_request
  if (!pr || pr.draft) return null
  const repoUrl = repoUrlOf(pr)
  const issues = issuesLine(pr.body, repoUrl, pr.number)
  const withIssues = (lines) => (issues ? [...lines, issues] : lines)

  switch (event.action) {
    case 'opened':
    case 'reopened':
    case 'ready_for_review':
      return [
        ...withIssues([
          `🟢 ${tags('pr', pr.base?.ref)} <b>Открыт PR</b> от ${esc(pr.user?.login)}${labels(pr) ? ` · ${esc(labels(pr))}` : ''}`,
          prLine(pr),
        ]),
        prQuote(pr),
      ].join('\n')
    case 'review_requested': {
      const who = event.requested_reviewer?.login ?? event.requested_team?.name
      return who ? [`👀 ${tags('review', pr.base?.ref)} <b>Ревью запрошено</b> у ${esc(who)}`, prLine(pr)].join('\n') : null
    }
    case 'closed': {
      if (!pr.merged) return null
      const sha = pr.merge_commit_sha
      return [
        ...withIssues([`🟣 ${tags('merged', pr.base?.ref)} <b>Влит в ${esc(pr.base?.ref)}</b> · ${esc(pr.merged_by?.login ?? '')}`, prLine(pr)]),
        prQuote(pr, { commitSha: sha, commitUrl: sha ? `${repoUrl}/commit/${sha}` : undefined, message: '' }),
      ].join('\n')
    }
    default:
      return null
  }
}

const REVIEW_STATE = {
  approved: ['✅', 'approve'],
  changes_requested: ['❌', 'changes requested'],
  commented: ['💬', 'комментарий'],
}

/** pull_request_review: submitted. */
export function formatReview(event) {
  const { review, pull_request: pr } = event
  if (event.action !== 'submitted' || !review || !pr || pr.draft) return null
  const state = REVIEW_STATE[review.state]
  if (!state) return null
  const [icon, word] = state
  const lines = [`${icon} ${tags('review', pr.base?.ref)} <b>Ревью</b> от ${esc(review.user?.login)}: ${link(word, review.html_url)}`, prLine(pr)]
  const body = String(review.body ?? '').trim()
  if (body) lines.push(`«${esc(cut(body))}»`)
  return lines.join('\n')
}

/**
 * workflow_run: completed с плохим исходом. failedJobs — имена упавших джоб, их достаёт notify.mjs
 * через API (в самом событии их нет). cancelled — не поломка: concurrency отменяет прогон при
 * новом пуше, и слать про это нечего.
 */
export function formatWorkflowRun(event, failedJobs = []) {
  const run = event.workflow_run
  if (!run || !['failure', 'timed_out'].includes(run.conclusion)) return null
  const repoUrl = run.repository?.html_url ?? ''
  const pr = run.pull_requests?.[0]
  const where = pr ? link(`PR #${pr.number}`, `${repoUrl}/pull/${pr.number}`) : `<code>${esc(run.head_branch)}</code>`
  const lines = [`🔴 ${tags('ci', pr ? 'pr' : run.head_branch)} <b>${esc(run.name)}</b> ${run.conclusion === 'timed_out' ? 'по таймауту' : 'упал'} · ${where}`]
  if (failedJobs.length) lines.push(`джобы: ${esc(failedJobs.join(', '))}`)
  lines.push(link('лог прогона', run.html_url))
  lines.push(
    quote({
      branchName: run.head_branch,
      branchUrl: `${repoUrl}/tree/${run.head_branch}`,
      commitSha: run.head_sha,
      commitUrl: `${repoUrl}/commit/${run.head_sha}`,
      author: run.actor?.login,
      authorUrl: run.actor?.html_url,
      message: run.head_commit?.message,
    }),
  )
  return lines.join('\n')
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)] ?? 0
}

/**
 * Сводка Lighthouse по отчётам LHR: медиана по URL, как в lighthouserc (aggregationMethod=median).
 * @param {object[]} reports содержимое lhr-*.json
 * @param {{ok: boolean, runUrl: string, pr?: object, branch?: string}} ctx pr — pull_request из события,
 *   иначе branch — ветка push (develop | main)
 */
export function formatLighthouse(reports, ctx) {
  const icon = ctx.ok ? '🟢' : '🔴'
  const { pr } = ctx
  const head = [
    `${icon} ${tags('lighthouse', pr ? 'pr' : ctx.branch)} <b>Lighthouse</b>${ctx.ok ? '' : ' · <b>бюджет не прошёл</b>'}`,
    pr ? prLine(pr) : `<code>${esc(ctx.branch)}</code>`,
  ]
  const issues = pr ? issuesLine(pr.body, repoUrlOf(pr), pr.number) : ''
  if (issues) head.push(issues)
  if (!reports.length) return [...head, 'отчётов нет: сборка или сбор упали', link('лог прогона', ctx.runUrl)].join('\n')

  const byUrl = new Map()
  for (const r of reports) {
    const url = r.finalDisplayedUrl.replace(/^https?:\/\/[^/]+/, '') || '/'
    if (!byUrl.has(url)) byUrl.set(url, [])
    byUrl.get(url).push(r)
  }
  const kb = (b) => Math.round(b / 1024)
  const size = (r, type) => (r.audits['resource-summary']?.details?.items ?? []).find((i) => i.resourceType === type)?.transferSize ?? 0
  const rows = [...byUrl].map(([url, rs]) => {
    const perf = Math.round(median(rs.map((r) => (r.categories.performance?.score ?? 0) * 100)))
    const lcp = median(rs.map((r) => r.audits['largest-contentful-paint']?.numericValue ?? 0))
    const m = (type) => kb(median(rs.map((r) => size(r, type))))
    return `<code>${esc(url)}</code> · perf ${perf} · LCP ${(lcp / 1000).toFixed(1)} с · ${m('total')} KB (JS ${m('script')}, картинки ${m('image')}, шрифты ${m('font')})`
  })
  return [...head, ...rows, link('лог прогона', ctx.runUrl)].join('\n')
}
