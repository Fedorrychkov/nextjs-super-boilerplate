#!/usr/bin/env node
// Гейт самого гейта. Контракт PreToolUse в Claude Code различает три исхода: 0 — разрешено,
// 2 — запрещено, всё остальное — «не мешать». Отсутствующий скрипт даёт 127, потерянный бит x —
// 126, и оба читаются как «выполнить команду»: весь агентский слой оказывается выключен незаметно.
// Поэтому хук в settings.json обязан быть обёрткой с проверкой `[ -x ]` (она переводит 126/127
// в 2), а этот скрипт следит за битом, за обёрткой и за тем, что хук вообще навешен.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const guard = 'scripts/guard-external.sh'
const settings = '.claude/settings.json'
const problems = []

if (!existsSync(join(root, guard))) {
  problems.push(`${guard}: файла нет — хук вернёт 127, и Claude Code выполнит команду`)
} else {
  const entry = execFileSync('git', ['ls-files', '-s', guard], { cwd: root, encoding: 'utf8' }).trim()
  const mode = entry.split(' ')[0]

  if (!entry) problems.push(`${guard}: не под git — режим файла не закреплён`)
  else if (mode !== '100755') problems.push(`${guard}: режим в git ${mode}, нужен 100755 — без бита x хук вернёт 126 и команда выполнится`)
}

if (!existsSync(join(root, settings))) {
  problems.push(`${settings}: нет — PreToolUse не навешен, гейта нет`)
} else {
  const raw = readFileSync(join(root, settings), 'utf8')

  if (!raw.includes('guard-external.sh')) problems.push(`${settings}: PreToolUse не ссылается на ${guard}`)
  if (!raw.includes('[ -x ')) problems.push(`${settings}: хук вызывает скрипт напрямую. Нужна обёртка с проверкой -x: иначе 126/127 читаются как «не блокировать»`)
}

if (problems.length) {
  console.error('✗ агентский гейт:\n')
  for (const p of problems) console.error(`  • ${p}`)
  process.exit(1)
}

console.log('агентский гейт: скрипт исполняем, хук навешен через обёртку с проверкой -x')
