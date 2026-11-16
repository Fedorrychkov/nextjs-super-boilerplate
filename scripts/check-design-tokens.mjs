#!/usr/bin/env node
// Гейт токенов темы: `src/app/tokens.css` совпадает с тем, что генерирует `config/design-tokens.json`.
// Правка сгенерированного файла руками пропала бы при следующем `pnpm tokens`.
import process from 'node:process'

import { run } from './design-tokens.mjs'

process.exit(run({ check: true }))
