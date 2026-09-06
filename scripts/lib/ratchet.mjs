// Общая механика «храповика»: число может только уменьшаться.
// Baseline хранится в scripts/<name>-baseline.txt. Больше baseline → падение.
// Меньше baseline → тоже падение, но с подсказкой обновить baseline тем же PR
// (`node scripts/check-<name>.mjs --update`), чтобы храповик реально затягивался.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

export const SRC_EXT = /\.(js|jsx|ts|tsx)$/;

export function walk(dir, { include = SRC_EXT, exclude = /\.(test|spec)\.[jt]sx?$/ } = {}) {
  const out = [];
  const visit = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) visit(p);
      else if (include.test(name) && !exclude.test(name)) out.push(p);
    }
  };
  visit(dir);
  return out;
}

export function countMatches(files, regex) {
  const perFile = [];
  let total = 0;
  for (const f of files) {
    const n = (readFileSync(f, 'utf8').match(regex) ?? []).length;
    if (n) {
      perFile.push([f, n]);
      total += n;
    }
  }
  return { total, perFile: perFile.sort((a, b) => b[1] - a[1]) };
}

export function ratchet({ name, baselinePath, current, unit, hint, root, details = [] }) {
  const update = process.argv.includes('--update');
  const baseline = existsSync(baselinePath) ? Number(readFileSync(baselinePath, 'utf8').trim()) : null;

  if (update || baseline === null) {
    writeFileSync(baselinePath, `${current}\n`);
    console.log(`${name}: baseline записан = ${current} ${unit}`);
    return 0;
  }

  if (current === baseline) {
    console.log(`${name}: ${current} ${unit}, как в baseline`);
    return 0;
  }

  const rel = (p) => relative(root, p);
  if (current > baseline) {
    console.error(`${name}: ${current} ${unit}, в baseline ${baseline}. Стало больше на ${current - baseline}.`);
    console.error(hint);
    for (const [f, n] of details.slice(0, 15)) console.error(`  ${n}  ${rel(f)}`);
    return 1;
  }

  console.error(`${name}: ${current} ${unit}, в baseline ${baseline}. Стало меньше, спасибо.`);
  console.error(`Зафиксируй прогресс тем же PR: node scripts/check-${name}.mjs --update`);
  return 1;
}
