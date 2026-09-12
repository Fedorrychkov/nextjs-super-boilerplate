import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Контракт агента должен ДОЕЗЖАТЬ до агента целиком.
 *
 * У Codex потолок на файл инструкций — 32 768 байт, и при превышении он не падает, а **молча
 * обрезает**: часть правил просто не существует для агента, и он об этом не сообщает. Поймано
 * ровно так — правила перенесли в `AGENTS.md`, чтобы их видели все инструменты, и тем же
 * движением переполнили файл на 2.8 КБ. Обрезался хвост со справкой; следующая правка в середину
 * унесла бы что-нибудь из обязательных правил.
 *
 * Глазами размер не виден, поэтому проверка машинная. Бюджет ниже потолка намеренно: упереться
 * ровно в предел значит узнать о проблеме от того, кто добавит следующую строку.
 *
 * Второе правило — про `@file`-импорты. Claude их раскрывает, Codex нет. Правило, вынесенное
 * через `@`, связывает один инструмент и тихо не связывает другой — то есть создаёт ровно ту
 * асимметрию, ради устранения которой этот файл и заведён.
 */

const CODEX_LIMIT = 32_768
const BUDGET = 28_672 // 28 КБ: запас в 4 КБ на то, что допишут после нас

// Пути от корня репозитория: прямой запуск из любого каталога не должен падать.
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const contract = 'AGENTS.md'
// Двойник необязателен: у формата «один канон» его просто нет. Отсутствие — не ошибка, а вот
// сгнивший двойник обманывает молча: правила, которых в нём нет, для читающего его агента не существуют.
const twins = ['AGENTS_RU.md'].filter((twin) => existsSync(join(root, twin)))
const TWIN_DRIFT = 0.25 // расхождение объёма больше четверти — двойник уже не перевод, а огрызок
const adapters = ['CLAUDE.md']

const problems = []

const raw = readFileSync(join(root, contract))
const bytes = raw.byteLength

if (bytes > BUDGET) {
  const over = bytes - BUDGET
  const truncated = bytes > CODEX_LIMIT

  problems.push(
    `${contract}: ${bytes} B при бюджете ${BUDGET} B (превышение ${over} B).` +
      (truncated
        ? ` Это УЖЕ выше потолка Codex (${CODEX_LIMIT} B) — файл обрезается молча, часть правил до агента не доходит.`
        : ` Потолок Codex ${CODEX_LIMIT} B ещё не пройден, но запас кончается.`) +
      '\n     Разгружать надо не сокращением объяснений, а выносом того, что уже ловят линтер и гейты:' +
      '\n     их сообщения — источник правды, пересказ в контракте расходится с ними при первой правке.',
  )
}

// Импорты ищем только в контракте: в переходнике `@AGENTS.md` — это его смысл.
const importLine = raw
  .toString('utf8')
  .split('\n')
  .findIndex((line) => /^\s*@[\w./-]+\s*$/.test(line))

if (importLine >= 0) {
  problems.push(
    `${contract}:${importLine + 1}: \`@file\`-импорт внутри контракта. Claude его раскроет, Codex — нет,` +
      '\n     и правило свяжет один инструмент, а другой промолчит. Текст должен лежать здесь целиком.',
  )
}

for (const twin of twins) {
  const twinBytes = readFileSync(join(root, twin)).byteLength

  if (twinBytes > BUDGET) {
    problems.push(`${twin}: ${twinBytes} B при бюджете ${BUDGET} B — тот же потолок Codex, что у ${contract}.`)
  }

  // Дрейф меряется в символах, не в байтах: кириллица в UTF-8 — два байта на букву, и по байтам
  // честный русский перевод выглядит на 40 % длиннее английского оригинала.
  const twinChars = readFileSync(join(root, twin), 'utf8').length
  const contractChars = raw.toString('utf8').length

  if (Math.abs(twinChars - contractChars) / contractChars > TWIN_DRIFT) {
    problems.push(
      `${twin}: ${twinChars} символов против ${contractChars} у ${contract} — расхождение больше ${TWIN_DRIFT * 100}%.` +
        '\n     Двойник не перевод, а огрызок. Либо досинхронизировать, либо удалить двойник и оставить один канон.',
    )
  }
}

for (const adapter of adapters) {
  const text = readFileSync(join(root, adapter), 'utf8')

  if (!text.includes(`@${contract}`)) {
    problems.push(`${adapter}: не импортирует \`@${contract}\` — переходник обязан подключать контракт, иначе правил у агента нет вовсе.`)
  }

  // Переходник, доросший до размера правил, — признак того, что в него снова кладут проект.
  if (Buffer.byteLength(text) > 4_096) {
    problems.push(`${adapter}: ${Buffer.byteLength(text)} B — переходник разросся. В нём только рантайм; правила проекта живут в ${contract}.`)
  }
}

if (problems.length) {
  console.error('✗ контракт агента:\n')

  for (const problem of problems) console.error(`  • ${problem}\n`)

  process.exit(1)
}

console.log(`контракт агента: ${contract} ${bytes} B из ${BUDGET} B${twins.length ? `, двойник ${twins.join(', ')} в синхроне` : ''}, переходники подключены`)
