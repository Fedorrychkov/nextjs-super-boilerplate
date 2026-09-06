#!/usr/bin/env node
// Гейт структуры документации.
//
// 1. Имя файла: `docs/<тема>/<kebab-name>.<ru|en>.md`. Папочные `README.md` — исключение: это
//    указатели, а не документы. Плоские файлы в корне `docs/` запрещены — так 33 документа и
//    расползлись по одному каталогу с суффиксами `_RU` у половины.
// 2. Каждый документ есть в индексе `docs/README.md`, и каждая ссылка индекса ведёт на живой файл.
//    Индекс — единственная карта; документ мимо индекса не существует для читателя.
// 3. Относительные ссылки во всех markdown-файлах репозитория ведут на существующие файлы.
//    Переезд ломает именно их, и глазами это не видно.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, normalize, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const docs = join(root, 'docs')
const problems = []

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })

// 1. naming
const docFiles = walk(docs).filter((p) => p.endsWith('.md'))
for (const file of docFiles) {
  const rel = relative(docs, file)
  if (rel === 'README.md' || /^[a-z0-9-]+\/README\.md$/.test(rel)) continue
  if (!/^[a-z0-9-]+\/[a-z0-9.-]+\.(ru|en)\.md$/.test(rel)) {
    problems.push(`docs/${rel}: ожидаю docs/<тема>/<kebab-name>.<ru|en>.md (или README.md как указатель папки)`)
  }
}

// 2. index coverage
const index = readFileSync(join(docs, 'README.md'), 'utf8')
const linkRe = /\]\(([^)\s#]+)(?:#[^)]*)?\)/g
const indexed = new Set(
  [...index.matchAll(linkRe)].map((m) => m[1]).filter((t) => !/^https?:/.test(t)).map((t) => normalize(join(docs, t))),
)
for (const file of docFiles) {
  if (file === join(docs, 'README.md')) continue
  if (!indexed.has(file)) problems.push(`docs/${relative(docs, file)}: нет в docs/README.md`)
}

// 3. relative links everywhere
const mdEverywhere = walk(root).filter(
  (p) => p.endsWith('.md') && !p.includes('/node_modules/') && !p.includes('/.next/') && !p.includes('/patch/') && !p.includes('/.git/'),
)
for (const file of mdEverywhere) {
  // Code spans and fenced blocks hold examples (`![alt](url)`), not links.
  const text = readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')
  for (const m of text.matchAll(linkRe)) {
    const target = m[1]
    if (/^(https?:|mailto:|tel:)/.test(target) || target.startsWith('<')) continue
    const resolved = normalize(join(dirname(file), target))
    if (!existsSync(resolved)) problems.push(`${relative(root, file)}: битая ссылка ${target}`)
  }
}

if (problems.length) {
  console.error('✗ структура документации:\n')
  for (const p of problems) console.error(`  • ${p}`)
  process.exit(1)
}

console.log(`документация: ${docFiles.length} файлов в docs/, имена и индекс сходятся, ссылки в ${mdEverywhere.length} md-файлах живые`)
