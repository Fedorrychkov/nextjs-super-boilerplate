#!/usr/bin/env node
// Гейт: число `eslint-disable` в коде может только уменьшаться.
//
// Правила линтера здесь не декоративные: запрет сырых <input>, Typography вместо голых <span>,
// порядок импортов. Каждый `eslint-disable` — это дыра в правиле, и список известных дыр обязан
// только сокращаться. Механика — общий «храповик» (scripts/lib/ratchet.mjs): baseline в
// scripts/eslint-disable-ratchet-baseline.txt, стало больше — падение с перечнем файлов, стало
// меньше — просьба зафиксировать прогресс тем же PR (`--update`).
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { countMatches, ratchet, walk } from './lib/ratchet.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
// Test files count too: eslint lints them, so a disable there is the same hole. A fork may
// remove a directory (mcp/), so absent ones are skipped rather than crashing the gate.
const files = ['src', 'lib', 'config', 'mcp', 'scripts']
  .map((dir) => join(root, dir))
  .filter((dir) => existsSync(dir))
  .flatMap((dir) => walk(dir, { exclude: /$^/ }))
const { total, perFile } = countMatches(files, /eslint-disable/g)

process.exit(
  ratchet({
    name: 'eslint-disable-ratchet',
    baselinePath: join(root, 'scripts', 'eslint-disable-ratchet-baseline.txt'),
    current: total,
    unit: 'eslint-disable в src/lib/config/mcp/scripts',
    hint: 'Новый eslint-disable запрещён: правило существует не просто так. Где больше всего:',
    root,
    details: perFile,
  }),
)
