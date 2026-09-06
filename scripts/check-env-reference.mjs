#!/usr/bin/env node
// Гейт: `.env.example` и справочники docs/configure/env-reference.{ru,en}.md описывают один и тот же
// набор переменных. Справочник пишется руками (генератор из шаблона — лишний слой и формат
// комментариев, который надо соблюдать), поэтому расхождение ловится здесь, а не глазами: новая
// переменная без строки в справочнике или строка про удалённую переменную — падение.
//
// Сравниваются ИМЕНА, не значения и не порядок. Блок между `<!-- env-gate: ignore -->` и
// `<!-- /env-gate -->` не учитывается: там описаны входы деплоя и compose, которых в `.env` нет.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const templateKeys = new Set(
  readFileSync(join(root, '.env.example'), 'utf8')
    .split('\n')
    .map((line) => /^([A-Z][A-Z0-9_]*)=/.exec(line)?.[1])
    .filter(Boolean),
)

const references = ['docs/configure/env-reference.ru.md', 'docs/configure/env-reference.en.md']
const problems = []

for (const file of references) {
  const text = readFileSync(join(root, file), 'utf8').replace(/<!-- env-gate: ignore -->[\s\S]*?<!-- \/env-gate -->/g, '')
  const documented = new Set([...text.matchAll(/^\| `([A-Z][A-Z0-9_]*)` \|/gm)].map((m) => m[1]))

  const missing = [...templateKeys].filter((k) => !documented.has(k))
  const stale = [...documented].filter((k) => !templateKeys.has(k))

  if (missing.length) problems.push(`${file}: нет строки про ${missing.join(', ')} (есть в .env.example)`)
  if (stale.length) problems.push(`${file}: описаны ${stale.join(', ')}, которых нет в .env.example`)
}

if (problems.length) {
  console.error('✗ справочник env расходится с шаблоном:\n')
  for (const p of problems) console.error(`  • ${p}`)
  process.exit(1)
}

console.log(`справочник env: ${templateKeys.size} переменных, ${references.length} языка в паритете с .env.example`)
