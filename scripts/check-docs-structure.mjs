#!/usr/bin/env node
// Гейт структуры документации.
//
// 1. Имя файла: `docs/<тема>/<kebab-name>.<ru|en>.md`. Папочные `README.md` — исключение: это
//    указатели, а не документы. Плоские файлы в корне `docs/` запрещены — так 33 документа и
//    расползлись по одному каталогу с суффиксами `_RU` у половины.
// 2. Каждый документ есть в индексе `docs/README.md`, и каждая ссылка индекса ведёт на живой файл.
//    Индекс — единственная карта; документ мимо индекса не существует для читателя.
// 3. Относительные ссылки во всех markdown-файлах репозитория ведут на существующие файлы, а
//    якоря (`file.md#раздел`, `#раздел`) — на существующие заголовки. Переезд и переименование
//    заголовка ломают именно их, и глазами это не видно.
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
// Планы индексируются своим указателем: их десятки, они приходят и закрываются, и держать их
// в общей карте документации значит переписывать её на каждый PR.
const planIndexPath = join(docs, 'plans', 'README.md')
const planIndex = existsSync(planIndexPath) ? readFileSync(planIndexPath, 'utf8') : ''
const linkRe = /\]\(([^)\s#]+)(?:#[^)]*)?\)/g
const indexed = new Set(
  [
    ...[...index.matchAll(linkRe)].map((m) => [docs, m[1]]),
    ...[...planIndex.matchAll(linkRe)].map((m) => [join(docs, 'plans'), m[1]]),
  ]
    .filter(([, t]) => !/^https?:/.test(t))
    .map(([base, t]) => normalize(join(base, t))),
)
for (const file of docFiles) {
  if (file === join(docs, 'README.md')) continue
  if (!indexed.has(file)) problems.push(`docs/${relative(docs, file)}: нет в ${relative(docs, file).startsWith('plans/') ? 'docs/plans/README.md' : 'docs/README.md'}`)
}

// 3. relative links and anchors everywhere
const mdEverywhere = walk(root).filter(
  (p) =>
    p.endsWith('.md') &&
    !p.includes('/node_modules/') &&
    !p.includes('/.next/') &&
    !p.includes('/patch/') &&
    !p.includes('/.git/') &&
    !p.includes('/.claude/worktrees/'),
)

// Code spans and fenced blocks hold examples (`![alt](url)`, `# comment`), not links or headings.
const stripCode = (text) => text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')

/** GitHub's heading id: lowercase, markup and punctuation dropped, every space becomes a hyphen (not collapsed). */
const slug = (heading) =>
  heading
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .toLowerCase()
    .replace(/[`*_]/g, '')
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-')

const anchorCache = new Map()
const anchorsOf = (file) => {
  if (anchorCache.has(file)) return anchorCache.get(file)

  const raw = readFileSync(file, 'utf8')
  const seen = new Map()
  const ids = new Set()

  for (const line of raw.replace(/```[\s\S]*?```/g, '').split('\n')) {
    const heading = /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(line)

    if (!heading) continue

    const base = slug(heading[1])
    const count = seen.get(base) ?? 0

    // A repeated heading gets `-1`, `-2`… on GitHub.
    ids.add(count ? `${base}-${count}` : base)
    seen.set(base, count + 1)
  }

  for (const m of raw.matchAll(/<a\s+(?:id|name)=["']([^"']+)["']/g)) ids.add(m[1])

  anchorCache.set(file, ids)

  return ids
}

const hrefRe = /\]\(([^)\s]+)\)/g

for (const file of mdEverywhere) {
  const text = stripCode(readFileSync(file, 'utf8'))

  for (const m of text.matchAll(hrefRe)) {
    const href = m[1]

    if (/^(https?:|mailto:|tel:)/.test(href) || href.startsWith('<')) continue

    const [target, anchor] = href.split('#')
    const resolved = target ? normalize(join(dirname(file), target)) : file

    if (target && !existsSync(resolved)) {
      problems.push(`${relative(root, file)}: битая ссылка ${target}`)
      continue
    }

    if (anchor && resolved.endsWith('.md') && !anchorsOf(resolved).has(decodeURIComponent(anchor).toLowerCase())) {
      problems.push(`${relative(root, file)}: якорь #${anchor} не найден в ${target ? target : 'этом же файле'}`)
    }
  }
}

if (problems.length) {
  console.error('✗ структура документации:\n')
  for (const p of problems) console.error(`  • ${p}`)
  process.exit(1)
}

console.log(`документация: ${docFiles.length} файлов в docs/, имена и индекс сходятся, ссылки и якоря в ${mdEverywhere.length} md-файлах живые`)
