import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const script = join(dirname(fileURLToPath(import.meta.url)), 'check-public-env.mjs')

const run = (files) => {
  const root = mkdtempSync(join(tmpdir(), 'public-env-'))

  try {
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true })
      writeFileSync(join(root, path), content)
    }

    return spawnSync(process.execPath, [script], { env: { ...process.env, PUBLIC_ENV_ROOT: root }, encoding: 'utf8' })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

const list = (build, serverBuild = []) => JSON.stringify({ build, serverBuild })

describe('check-public-env', () => {
  it('passes when code, template and list agree', () => {
    const result = run({
      'config/public-env.json': list(['NEXT_PUBLIC_SITE_URL'], ['VAPID_SUBJECT']),
      'src/a.ts': 'process.env.NEXT_PUBLIC_SITE_URL',
      '.env.example': 'NEXT_PUBLIC_SITE_URL=\nVAPID_SUBJECT=\n',
    })

    assert.equal(result.status, 0, result.stderr)
  })

  it('fails on a public name the code reads but the list lacks — the deploy would drop it', () => {
    const result = run({
      'config/public-env.json': list(['NEXT_PUBLIC_SITE_URL']),
      'src/a.ts': 'process.env.NEXT_PUBLIC_SITE_URL; process.env.NEXT_PUBLIC_NEW_FLAG',
      '.env.example': 'NEXT_PUBLIC_SITE_URL=\n',
    })

    assert.equal(result.status, 1)
    assert.match(result.stderr, /NEXT_PUBLIC_NEW_FLAG/)
  })

  it('fails on a secret-looking server build name and a stale list entry', () => {
    const result = run({
      'config/public-env.json': list(['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_GONE'], ['SMTP_PASSWORD']),
      'src/a.ts': 'process.env.NEXT_PUBLIC_SITE_URL',
      '.env.example': 'NEXT_PUBLIC_SITE_URL=\nSMTP_PASSWORD=\n',
    })

    assert.equal(result.status, 1)
    assert.match(result.stderr, /SMTP_PASSWORD .*секрет/)
    assert.match(result.stderr, /NEXT_PUBLIC_GONE/)
  })

  it('fails without the list at all', () => {
    const result = run({ 'src/a.ts': '' })

    assert.equal(result.status, 1)
  })
})
