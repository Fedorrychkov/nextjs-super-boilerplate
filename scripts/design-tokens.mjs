#!/usr/bin/env node
// Цвета темы живут в одном месте — `config/design-tokens.json`; `src/app/tokens.css` из него
// генерируется (`pnpm tokens`), руками не правится. Раньше палитра была размазана по трём блокам
// `globals.css` (`:root` и два `.dark`), и сменить цвет при форке значило найти все копии.
// `--check` — для гейта: сгенерированное расходится с файлом → выход 1.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const NAME = /^[a-z][a-z0-9-]*$/
const VALUE = /^[^;{}]+$/

export const HEADER = '/* Generated from config/design-tokens.json by `pnpm tokens`. Do not edit by hand. */'

/** Ошибки источника: пустой список — источник годен. */
export function validateTokens(tokens) {
  const errors = []
  const light = tokens?.light
  const dark = tokens?.dark ?? {}

  if (!light || typeof light !== 'object' || !Object.keys(light).length) return ['light: пусто — светлая тема обязана задавать все цвета']

  for (const [theme, set] of [
    ['light', light],
    ['dark', dark],
  ]) {
    for (const [name, value] of Object.entries(set)) {
      if (!NAME.test(name)) errors.push(`${theme}.${name}: имя — латиница в нижнем регистре, цифры и дефис`)
      if (typeof value !== 'string' || !VALUE.test(value.trim())) errors.push(`${theme}.${name}: значение пустое или содержит ; { }`)
    }
  }

  // Тёмная тема только переопределяет: имя, которого нет в светлой, в светлой теме осталось бы без значения.
  for (const name of Object.keys(dark)) {
    if (!(name in light)) errors.push(`dark.${name}: нет в light — в светлой теме переменная была бы не задана`)
  }

  return errors
}

const block = (selector, set) => `${selector} {\n${Object.entries(set)
  .map(([name, value]) => `  --${name}: ${value.trim()};`)
  .join('\n')}\n}\n`

export function renderTokensCss(tokens) {
  return `${HEADER}\n\n${block(':root', tokens.light)}\n${block('.dark', tokens.dark ?? {})}`
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = join(root, 'config', 'design-tokens.json')
const TARGET = join(root, 'src', 'app', 'tokens.css')

export function run({ check }) {
  const tokens = JSON.parse(readFileSync(SOURCE, 'utf8'))
  const errors = validateTokens(tokens)

  if (errors.length) {
    console.error(`design-tokens: config/design-tokens.json\n${errors.map((error) => `  - ${error}`).join('\n')}`)

    return 1
  }

  const css = renderTokensCss(tokens)

  if (!check) {
    writeFileSync(TARGET, css)
    console.log(`design-tokens: src/app/tokens.css — ${Object.keys(tokens.light).length} light, ${Object.keys(tokens.dark ?? {}).length} dark`)

    return 0
  }

  let current = ''

  try {
    current = readFileSync(TARGET, 'utf8')
  } catch {
    // нет файла — то же расхождение
  }

  if (current !== css) {
    console.error('design-tokens: src/app/tokens.css не совпадает с config/design-tokens.json — запусти `pnpm tokens` и закоммить оба файла')

    return 1
  }

  return 0
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(run({ check: process.argv.includes('--check') }))
