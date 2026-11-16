#!/usr/bin/env node
// Гейт: каждое стороннее GitHub Action закреплено по 40-значному SHA, а docker-образы, которые
// workflow тянет из реестра, — по digest. Тег можно перевесить на другой коммит (так в марте 2026
// увели trivy-action), SHA и digest — нет. Рядом с SHA пишется комментарий с версией: его читает
// человек и dependabot, а исполняется хеш. Локальные `uses: ./…` не проверяются.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = process.env.ACTIONS_PINNED_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, '.github', 'workflows')

if (!existsSync(dir)) {
  console.log('check-actions-pinned: .github/workflows нет — нечего проверять')
  process.exit(0)
}

const files = readdirSync(dir).filter((name) => /\.ya?ml$/.test(name))
const problems = []

for (const name of files) {
  const lines = readFileSync(join(dir, name), 'utf8').split('\n')

  lines.forEach((line, index) => {
    const at = `.github/workflows/${name}:${index + 1}`
    const uses = line.match(/^\s*(?:-\s*)?uses:\s*['"]?([^'"\s#]+)/)

    if (uses && !uses[1].startsWith('./')) {
      const version = uses[1].split('@')[1]

      if (!version || !/^[0-9a-f]{40}$/.test(version)) {
        problems.push(`${at}: uses «${uses[1]}» не закреплён по SHA (нужен 40-значный хеш и комментарий с версией)`)
      }
    }

    const image = line.match(/(?:docker run[^\n]*?|image:\s*['"]?)((?:ghcr\.io|docker\.io|[a-z0-9.-]+\.[a-z]{2,})\/[^\s'"]+)/)

    if (image && !image[1].includes('@sha256:')) {
      problems.push(`${at}: образ «${image[1]}» не закреплён по digest (нужен @sha256:…)`)
    }
  })
}

if (problems.length) {
  console.error('check-actions-pinned:\n' + problems.map((problem) => `  - ${problem}`).join('\n'))
  console.error('\nТег можно перевесить на другой коммит, SHA и digest — нет.')
  process.exit(1)
}

console.log(`check-actions-pinned: ${files.length} workflow, все действия и образы закреплены`)
