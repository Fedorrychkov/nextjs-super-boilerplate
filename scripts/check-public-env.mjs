#!/usr/bin/env node
// Гейт публичных переменных: сборка вшивает в клиентский код только имена из
// `config/public-env.json`, и деплой передаёт в `docker build` только их. Ошибочно названная
// секретная переменная `NEXT_PUBLIC_…` не должна уехать в образ и в браузер из-за одного префикса.
//
// Проверяет: каждое `NEXT_PUBLIC_*`, которое читает код (src, lib, config, mcp, next.config.ts), и
// каждое из `.env.example` есть в списке — иначе деплой молча не передал бы его в сборку; каждое
// имя списка где-то читается или описано — список не обрастает мусором. В `build` — только
// `NEXT_PUBLIC_*`; имена без префикса — в `serverBuild` и без признаков секрета в имени.
// `PUBLIC_ENV_ROOT` — корень приложения, для теста.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = process.env.PUBLIC_ENV_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), '..')
const PATTERN = /NEXT_PUBLIC_[A-Z0-9_]+/g
const SOURCES = ['src', 'lib', 'config', 'mcp']
const EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs)$/
/** Признаки секрета в имени: такое в build-arg (и в историю слоёв образа) не передаём. */
const SECRET_LIKE = /SECRET|PASSWORD|PASSWD|TOKEN|PRIVATE|CREDENTIAL|_KEY|^KEY|_DSN|_URI|_URL/

const walk = (path) => {
  if (!existsSync(path)) return []

  if (statSync(path).isFile()) return EXTENSIONS.test(path) ? [path] : []

  return readdirSync(path).flatMap((name) => (name === 'node_modules' || name.startsWith('.') ? [] : walk(join(path, name))))
}

const listFile = join(root, 'config', 'public-env.json')

if (!existsSync(listFile)) {
  console.error('check-public-env: нет config/public-env.json — список публичных переменных обязателен')
  process.exit(1)
}

const lists = JSON.parse(readFileSync(listFile, 'utf8'))
const build = new Set(lists.build ?? [])
const serverBuild = new Set(lists.serverBuild ?? [])

const used = new Set()
const files = [...SOURCES.flatMap((dir) => walk(join(root, dir))), join(root, 'next.config.ts')].filter((file) => existsSync(file))

for (const file of files) {
  for (const name of readFileSync(file, 'utf8').match(PATTERN) ?? []) used.add(name)
}

const example = new Set()
const exampleFile = join(root, '.env.example')

if (existsSync(exampleFile)) {
  for (const line of readFileSync(exampleFile, 'utf8').split('\n')) {
    const name = /^([A-Z0-9_]+)=/.exec(line)?.[1]

    if (name) example.add(name)
  }
}

const problems = []

for (const name of [...build].sort()) {
  if (!name.startsWith('NEXT_PUBLIC_')) problems.push(`${name} в build без префикса NEXT_PUBLIC_ — такие имена только в serverBuild`)
}

for (const name of [...serverBuild].sort()) {
  if (name.startsWith('NEXT_PUBLIC_')) problems.push(`${name} в serverBuild — публичные имена только в build`)

  if (SECRET_LIKE.test(name)) problems.push(`${name} в serverBuild похоже на секрет — в сборку не передаём`)

  if (!example.has(name)) problems.push(`${name} в serverBuild не описан в .env.example`)
}

for (const name of [...used].sort()) {
  if (!build.has(name)) problems.push(`${name} читается в коде, но его нет в config/public-env.json — деплой не передаст его в сборку`)
}

for (const name of [...example].sort()) {
  if (name.startsWith('NEXT_PUBLIC_') && !build.has(name)) problems.push(`${name} есть в .env.example, но его нет в config/public-env.json`)
}

for (const name of [...build].sort()) {
  if (!used.has(name) && !example.has(name)) problems.push(`${name} в config/public-env.json не читается и не описан в .env.example — уберите из списка`)
}

if (problems.length) {
  console.error('check-public-env:\n' + problems.map((problem) => `  - ${problem}`).join('\n'))
  process.exit(1)
}

console.log(`check-public-env: ${build.size} публичных имён и ${serverBuild.size} серверных для сборки, все на месте`)
