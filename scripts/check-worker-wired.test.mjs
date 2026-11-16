import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const script = join(dirname(fileURLToPath(import.meta.url)), 'check-worker-wired.mjs')

const run = (files) => {
  const root = mkdtempSync(join(tmpdir(), 'worker-wired-'))

  try {
    for (const dir of ['lib', 'src', 'scripts']) mkdirSync(join(root, dir), { recursive: true })

    for (const [path, content] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true })
      writeFileSync(join(root, path), content)
    }

    return spawnSync(process.execPath, [script], { env: { ...process.env, WORKER_WIRED_ROOT: root }, encoding: 'utf8' })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

const queueDef = "import { defineQueue } from './queue'\nexport const mailQueue = defineQueue<{ id: string }>({ name: 'mail', concurrency: 1, attempts: 1, backoffMs: 1 })\n"
const consumer = "import { mailQueue } from './mail.queue'\nexport const start = () => consume(mailQueue, async () => {})\n"

describe('check-worker-wired', () => {
  it('passes when the consumer module is imported by the worker entry', () => {
    const result = run({
      'lib/queues/mail.queue.ts': queueDef,
      'lib/queues/mail.consumer.ts': consumer,
      'scripts/worker.ts': "import { start } from '@lib/queues/mail.consumer'\n",
    })

    assert.equal(result.status, 0, result.stderr)
  })

  it('fails when the consumer exists but the worker does not import it', () => {
    const result = run({
      'lib/queues/mail.queue.ts': queueDef,
      'lib/queues/mail.consumer.ts': consumer,
      'scripts/worker.ts': "// import { start } from '@lib/queues/mail.consumer'\nimport x from '@lib/other'\n",
    })

    assert.equal(result.status, 1)
    assert.match(result.stderr, /mailQueue/)
  })

  it('fails on a raw new Queue( outside wired modules unless marked with a reason', () => {
    const base = { 'lib/queues/mail.queue.ts': queueDef, 'lib/queues/mail.consumer.ts': consumer, 'scripts/worker.ts': "import { start } from '@lib/queues/mail.consumer'\n" }

    assert.equal(run({ ...base, 'lib/stray.ts': 'const q = new Queue("x")\n' }).status, 1)
    assert.equal(run({ ...base, 'lib/stray.ts': '// worker-entry-ok: test fixture\nconst q = new Queue("x")\n' }).status, 0)
  })

  it('fails loudly when it finds no queue definitions at all', () => {
    const result = run({ 'scripts/worker.ts': "import x from '@lib/other'\n" })

    assert.equal(result.status, 1)
    assert.match(result.stderr, /ослепла/)
  })
})
