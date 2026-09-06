import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { closedIssues, esc, formatLighthouse, formatPullRequest, formatReview, formatWorkflowRun, issuesLine, mentionedIssues } from './format.mjs'

const repo = { html_url: 'https://github.com/owner/repo' }
const pr = (extra = {}) => ({
  number: 42,
  title: 'fix(deploy): <localhost> & CRLF',
  html_url: `${repo.html_url}/pull/42`,
  draft: false,
  body: 'Closes #24\n\nсм. #16 и PR #42',
  user: { login: 'Fedorrychkov', html_url: 'https://github.com/Fedorrychkov' },
  labels: [{ name: 'enhancement' }],
  head: { ref: 'feat/24-notify' },
  base: { ref: 'develop', repo },
  ...extra,
})

describe('esc', () => {
  it('экранирует трейлер с почтой в угловых скобках — то, на чём молчало деплойное уведомление', () => {
    assert.equal(esc('Co-Authored-By: X <noreply@anthropic.com> & Y'), 'Co-Authored-By: X &lt;noreply@anthropic.com&gt; &amp; Y')
  })
})

describe('issues', () => {
  it('различает «закрывает» и «связано» и выкидывает свой номер PR', () => {
    assert.deepEqual(closedIssues('Closes #24, fixes #7'), ['#24', '#7'])
    assert.deepEqual(mentionedIssues('см. #16 и #16, PR #42'), ['#16', '#42'])
    const line = issuesLine('Closes #24\nсм. #16 и PR #42', repo.html_url, 42)
    assert.match(line, /закрывает <a href="[^"]+\/issues\/24">#24<\/a>/)
    assert.match(line, /связано <a href="[^"]+\/issues\/16">#16<\/a>/)
    assert.doesNotMatch(line, /#42/)
  })
})

describe('formatPullRequest', () => {
  it('opened: заголовок экранирован, метки, база, цитата ветки и автора', () => {
    const text = formatPullRequest({ action: 'opened', pull_request: pr() })
    assert.match(text, /^🟢 #pr #develop <b>Открыт PR<\/b> от Fedorrychkov · enhancement/)
    assert.match(text, /&lt;localhost&gt; &amp; CRLF/)
    assert.match(text, /Ветка: <a href="[^"]+\/tree\/feat\/24-notify">feat\/24-notify<\/a> → develop/)
    assert.match(text, /закрывает/)
  })

  it('draft и synchronize — молчание', () => {
    assert.equal(formatPullRequest({ action: 'opened', pull_request: pr({ draft: true }) }), null)
    assert.equal(formatPullRequest({ action: 'synchronize', pull_request: pr() }), null)
  })

  it('closed без merge — молчание, с merge — «влит» с коммитом', () => {
    assert.equal(formatPullRequest({ action: 'closed', pull_request: pr({ merged: false }) }), null)
    const text = formatPullRequest({ action: 'closed', pull_request: pr({ merged: true, merged_by: { login: 'Fedorrychkov' }, merge_commit_sha: 'abcdef1234567' }) })
    assert.match(text, /^🟣 #merged #develop <b>Влит в develop<\/b> · Fedorrychkov/)
    assert.match(text, /Коммит: <a href="[^"]+\/commit\/abcdef1234567">abcdef1<\/a>/)
  })

  it('review_requested называет, у кого', () => {
    const text = formatPullRequest({ action: 'review_requested', pull_request: pr(), requested_reviewer: { login: 'stonedcatt' } })
    assert.match(text, /Ревью запрошено<\/b> у stonedcatt/)
  })
})

describe('formatReview', () => {
  it('вердикт словами и цитата, обрезанная до 200 символов', () => {
    const review = { state: 'changes_requested', html_url: `${repo.html_url}/pull/42#pullrequestreview-1`, user: { login: 'stonedcatt' }, body: 'ё'.repeat(300) }
    const text = formatReview({ action: 'submitted', review, pull_request: pr() })
    assert.match(text, /^❌ #review #develop <b>Ревью<\/b> от stonedcatt: <a href="[^"]+">changes requested<\/a>/)
    const quoted = text.split('\n').at(-1)
    assert.equal(quoted.length, 202)
    assert.ok(quoted.endsWith('…»'))
  })

  it('неизвестное состояние — молчание', () => {
    assert.equal(formatReview({ action: 'submitted', review: { state: 'dismissed' }, pull_request: pr() }), null)
  })
})

describe('formatWorkflowRun', () => {
  const run = (conclusion) => ({
    workflow_run: {
      name: 'CI',
      conclusion,
      html_url: `${repo.html_url}/actions/runs/1`,
      head_branch: 'develop',
      head_sha: '0123456789abcdef',
      head_commit: { message: 'fix: <x>' },
      actor: { login: 'Fedorrychkov', html_url: 'https://github.com/Fedorrychkov' },
      repository: repo,
      pull_requests: [],
    },
  })

  it('failure на ветке: имя workflow, ветка, джобы, лог', () => {
    const text = formatWorkflowRun(run('failure'), ['lint', 'test-db'])
    assert.match(text, /^🔴 #ci #develop <b>CI<\/b> упал · <code>develop<\/code>/)
    assert.match(text, /джобы: lint, test-db/)
    assert.match(text, /💬 fix: &lt;x&gt;/)
  })

  it('cancelled и success — молчание', () => {
    assert.equal(formatWorkflowRun(run('cancelled')), null)
    assert.equal(formatWorkflowRun(run('success')), null)
  })
})

describe('formatLighthouse', () => {
  const report = (url, perf, lcp, sizes) => ({
    finalDisplayedUrl: `http://localhost:3000${url}`,
    categories: { performance: { score: perf } },
    audits: {
      'largest-contentful-paint': { numericValue: lcp },
      'resource-summary': { details: { items: Object.entries(sizes).map(([resourceType, transferSize]) => ({ resourceType, transferSize })) } },
    },
  })

  it('медиана по URL из трёх прогонов, вес в KB', () => {
    const reports = [0.8, 0.9, 0.85].map((p) => report('/', p, 3000 + p * 1000, { total: 400 * 1024, script: 150 * 1024, image: 90 * 1024, font: 100 * 1024 }))
    const text = formatLighthouse(reports, { ok: true, branch: 'develop', runUrl: 'https://r' })
    assert.match(text, /^🟢 #lighthouse #develop <b>Lighthouse<\/b>\n<code>develop<\/code>/)
    assert.match(text, /<code>\/<\/code> · perf 85 · LCP 3\.9 с · 400 KB \(JS 150, картинки 90, шрифты 100\)/)
  })

  it('без отчётов — красное «сборка или сбор упали»', () => {
    const text = formatLighthouse([], { ok: false, pr: pr(), runUrl: 'https://r' })
    assert.match(text, /^🔴 #lighthouse #pr <b>Lighthouse<\/b> · <b>бюджет не прошёл<\/b>/)
    assert.match(text, /отчётов нет/)
  })
})
