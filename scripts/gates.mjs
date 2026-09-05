#!/usr/bin/env node
/**
 * Runs every `scripts/check-*.mjs` and prints one table.
 *
 * ALL of them run, always — `&&` would let the first failure hide the rest, and then fixing three
 * gates takes three CI rounds instead of one. Discovery is by filename on purpose: adding a gate
 * is adding a file, with nothing to wire up and nothing to forget to wire up.
 *
 * A gate is a plain node script: exit 0 = pass, anything else = fail, and whatever it printed is
 * the explanation.
 */
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const scriptsDir = dirname(fileURLToPath(import.meta.url))

const gates = readdirSync(scriptsDir)
  .filter((name) => name.startsWith('check-') && name.endsWith('.mjs'))
  .sort()

if (!gates.length) {
  console.error('gates: не найдено ни одного check-*.mjs — это само по себе подозрительно')
  process.exit(1)
}

const results = []

for (const gate of gates) {
  const started = Date.now()
  // cwd is the repo root: gates read AGENTS.md, baselines and sources relative to it.
  const run = spawnSync(process.execPath, [join(scriptsDir, gate)], { encoding: 'utf8', cwd: join(scriptsDir, '..') })
  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`.trimEnd()

  results.push({ gate: gate.replace(/^check-|\.mjs$/g, ''), ok: run.status === 0, ms: Date.now() - started, output })

  if (run.status !== 0 && output) console.error(`\n${output}\n`)
}

const width = Math.max(...results.map((result) => result.gate.length))

console.log('')
for (const result of results) {
  console.log(`  ${result.ok ? '✓' : '✗'}  ${result.gate.padEnd(width)}  ${String(result.ms).padStart(5)}ms`)
}

const failed = results.filter((result) => !result.ok)

console.log(`\n${results.length - failed.length}/${results.length} гейтов прошли\n`)

if (failed.length) process.exit(1)
