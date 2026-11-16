#!/usr/bin/env node
// Гейт: у каждой очереди есть обработчик в воркере.
//
// Самый частый тихий отказ фоновой работы: продюсер ставит задачу, отвечает «поставлено», а
// обработчика нет — задачи копятся в Redis, ошибок не видно. Отличить это от «пока нечего делать»
// можно только взглядом в Redis.
//
// Два правила.
// 1. Описание → consume. Каждая `export const X = defineQueue(...)` встречается как `consume(X` в
//    модуле, который импортирует `scripts/worker.ts`. Не «где-то вызывается», а модуль с вызовом
//    подключён: модуль, которого точка входа не знает, гарантированно ничего не разгребает.
// 2. Голые `new Queue(` / `new Worker(` — только в подключённых модулях: очередь мимо defineQueue
//    правило 1 не видит, и эта проверка ловит её хотя бы так.
//
// Импорты сверяются разобранными спецификаторами без комментариев, а не подстрокой: подстрока
// засчитала бы `// TODO: подключить …`. Исключение — `// worker-entry-ok: причина` в строке или
// строкой выше; причина обязательна и видна в диффе.
// `WORKER_WIRED_ROOT` — корень проверки для теста гейта.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = process.env.WORKER_WIRED_ROOT || join(dirname(fileURLToPath(import.meta.url)), '..')
const ENTRY = 'scripts/worker.ts'
const PRAGMA = 'worker-entry-ok'
const ZONES = ['lib', 'src']
const RAW_QUEUE = /\bnew\s+(Queue|Worker)\s*\(/
const DEFINITION = /export\s+const\s+(\w+)\s*=\s*defineQueue\s*[<(]/g
const ALIASES = [
  ['@lib/', 'lib/'],
  ['@config/', 'config/'],
  ['~/', 'src/'],
]

const fail = (lines) => {
  lines.forEach((line) => console.error(line))
  process.exit(1)
}

const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue

    const full = join(dir, entry)

    if (statSync(full).isDirectory()) walk(full, out)
    else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) out.push(full)
  }

  return out
}

// Block comments keep their line breaks so reported line numbers stay right.
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, '')).replace(/(^|[^:])\/\/.*$/gm, '$1')

const resolveRelative = (spec) => {
  const out = []

  for (const part of [...dirname(ENTRY).split('/'), ...spec.split('/')]) {
    if (part === '.' || part === '') continue

    if (part === '..') out.pop()
    else out.push(part)
  }

  return out.join('/')
}

const normalize = (spec) => {
  for (const [alias, real] of ALIASES) {
    if (spec.startsWith(alias)) return `${real}${spec.slice(alias.length)}`
  }

  return spec.startsWith('.') ? resolveRelative(spec) : spec
}

let entrySource = ''

try {
  entrySource = readFileSync(join(root, ENTRY), 'utf8')
} catch {
  fail([`check-worker-wired: не читается ${ENTRY} — точка входа воркера переехала; гейт без неё проверял бы пустоту`])
}

const imported = new Set(
  [...stripComments(entrySource).matchAll(/(?:\bfrom|\bimport|\brequire)\s*\(?\s*['"]([^'"]+)['"]/g)].map((match) => normalize(match[1]).replace(/\.ts$/, '')),
)

if (!imported.size) fail([`check-worker-wired: в ${ENTRY} не разобрано ни одного импорта — проверка ослепла`])

const sources = []

for (const zone of ZONES) {
  let files = []

  try {
    files = walk(join(root, zone))
  } catch {
    fail([`check-worker-wired: не читается каталог ${zone}/ — проверка потеряла зону, а не нашла её пустой`])
  }

  for (const file of files) {
    const rel = relative(root, file)

    sources.push({ rel, module: rel.replace(/\.ts$/, ''), text: readFileSync(file, 'utf8') })
  }
}

const definitions = sources.flatMap(({ rel, text }) => [...stripComments(text).matchAll(DEFINITION)].map((match) => ({ rel, name: match[1] })))

if (!definitions.length) {
  fail(['check-worker-wired: не найдено ни одной `export const X = defineQueue(` — проверка ослепла. Сменилась конвенция? Перепишите гейт.'])
}

const consumed = (name) =>
  sources.some(({ module, text }) => imported.has(module) && new RegExp(`\\bconsume\\s*\\(\\s*${name}\\b`).test(stripComments(text)))

const unconsumed = definitions.filter(({ name }) => !consumed(name))

const orphans = sources.flatMap(({ rel, module, text }) => {
  if (imported.has(module)) return []

  const lines = text.split('\n')
  const code = stripComments(text).split('\n')
  const hit = code.findIndex((line, index) => RAW_QUEUE.test(line) && !lines[index]?.includes(PRAGMA) && !lines[index - 1]?.includes(PRAGMA))

  return hit >= 0 ? [{ rel, line: hit + 1 }] : []
})

if (unconsumed.length || orphans.length) {
  const out = []

  if (unconsumed.length) {
    out.push(`check-worker-wired: очередь описана, а обработчика в ${ENTRY} нет:`)
    unconsumed.forEach(({ rel, name }) => out.push(`  - ${name} (${rel})`))
    out.push(`  Задачи туда не выполнит никто, а продюсер ответит «поставлено». Вызовите consume(<очередь>, …) в модуле и импортируйте его из ${ENTRY}.`)
  }

  if (orphans.length) {
    out.push(`check-worker-wired: очередь BullMQ мимо defineQueue, и ${ENTRY} про неё не знает:`)
    orphans.forEach(({ rel, line }) => out.push(`  - ${rel}:${line}`))
    out.push(`  Опишите очередь через defineQueue (lib/queues/queue.ts) или пометьте строку: // ${PRAGMA}: причина`)
  }

  fail(out)
}

console.log(`check-worker-wired: очередей ${definitions.length}, у всех есть обработчик в ${ENTRY}`)
