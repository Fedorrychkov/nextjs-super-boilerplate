#!/usr/bin/env node
// Отправка уведомления в Telegram из GitHub Actions.
//   node scripts/telegram/notify.mjs <pr|review|workflow-run|lighthouse>
// Событие читается из $GITHUB_EVENT_PATH. Секреты — те же, что у деплойных уведомлений:
// TG_TOKEN, TG_CHAT_ID и необязательный TG_THREAD_ID (тема в супергруппе). Без секретов (PR из
// форка) печатает текст и выходит с 0: уведомление не должно ломать CI. Отказ Bot API — выход с 1,
// чтобы сломанный токен был виден; шаг в workflow при этом с continue-on-error.
// Зависимостей нет намеренно: джоба бежит на sparse-checkout без pnpm install, за секунды.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { formatLighthouse, formatPullRequest, formatReview, formatWorkflowRun } from './format.mjs'

const kind = process.argv[2]
const env = process.env
const readEvent = () => JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8'))
const runUrl = `${env.GITHUB_SERVER_URL ?? 'https://github.com'}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`

/** Имена упавших джоб прогона: в событии workflow_run их нет, только через API. */
async function failedJobs(run) {
  if (!env.GITHUB_TOKEN) return []
  const res = await fetch(`${run.jobs_url}?per_page=100`, {
    headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' },
  })
  if (!res.ok) {
    console.error(`не смог прочитать джобы прогона: ${res.status}`)
    return []
  }
  const { jobs = [] } = await res.json()
  return jobs.filter((j) => ['failure', 'timed_out'].includes(j.conclusion)).map((j) => j.name)
}

function lighthouseReports() {
  const dir = env.LHCI_DIR ?? '.lighthouseci'
  try {
    return readdirSync(dir)
      .filter((f) => /^lhr-.*\.json$/.test(f))
      .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
  } catch {
    return []
  }
}

async function buildText() {
  switch (kind) {
    case 'pr':
      return formatPullRequest(readEvent())
    case 'review':
      return formatReview(readEvent())
    case 'workflow-run': {
      const event = readEvent()
      return formatWorkflowRun(event, await failedJobs(event.workflow_run))
    }
    case 'lighthouse': {
      const event = env.GITHUB_EVENT_NAME === 'pull_request' ? readEvent() : null
      return formatLighthouse(lighthouseReports(), {
        ok: env.LH_OUTCOME === 'success',
        pr: event?.pull_request,
        branch: env.GITHUB_REF_NAME,
        runUrl,
      })
    }
    default:
      throw new Error(`неизвестный вид уведомления: ${kind}. Ожидаю pr | review | workflow-run | lighthouse`)
  }
}

async function send(text) {
  const body = { chat_id: env.TG_CHAT_ID, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } }
  // Тема задаётся так же, как в scripts/notify-telegram.sh: ответом на корневое сообщение темы.
  // Тот же механизм, что уже доказанно попадает в тему CI/CD, а не второй, который надо проверять.
  if (env.TG_THREAD_ID) body.reply_to_message_id = Number(env.TG_THREAD_ID)
  const res = await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.ok) throw new Error(`Bot API ${res.status}: ${json.description ?? 'без описания'}`)
}

const text = await buildText()
if (!text) {
  console.log(`[${kind}] событие не требует сообщения`)
} else if (!env.TG_TOKEN || !env.TG_CHAT_ID) {
  console.log(`[${kind}] нет TG_TOKEN/TG_CHAT_ID (PR из форка или секреты не заданы), пропускаю:\n${text}`)
} else {
  await send(text)
  console.log(`[${kind}] отправлено`)
}
