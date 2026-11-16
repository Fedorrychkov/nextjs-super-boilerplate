import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const script = join(dirname(fileURLToPath(import.meta.url)), 'check-actions-pinned.mjs')
const SHA = 'a'.repeat(40)

const run = (workflow) => {
  const root = mkdtempSync(join(tmpdir(), 'actions-pinned-'))

  try {
    mkdirSync(join(root, '.github', 'workflows'), { recursive: true })
    writeFileSync(join(root, '.github', 'workflows', 'ci.yml'), workflow)

    return spawnSync(process.execPath, [script], { env: { ...process.env, ACTIONS_PINNED_ROOT: root }, encoding: 'utf8' })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

describe('check-actions-pinned', () => {
  it('accepts SHA-pinned actions, local workflows and digest-pinned images', () => {
    const result = run(
      [
        `      - uses: actions/checkout@${SHA} # v4.4.0`,
        '    uses: ./.github/workflows/quality.yml',
        '          docker run --rm ghcr.io/gitleaks/gitleaks:v8.30.1@sha256:' + 'b'.repeat(64) + ' detect',
      ].join('\n'),
    )

    assert.equal(result.status, 0, result.stderr)
  })

  it('rejects a tag or branch ref on an action', () => {
    const result = run('      - uses: actions/checkout@v4\n      - uses: appleboy/ssh-action@master\n')

    assert.equal(result.status, 1)
    assert.match(result.stderr, /actions\/checkout@v4/)
    assert.match(result.stderr, /appleboy\/ssh-action@master/)
  })

  it('rejects a registry image without a digest', () => {
    const result = run('          docker run --rm ghcr.io/gitleaks/gitleaks:latest detect\n')

    assert.equal(result.status, 1)
    assert.match(result.stderr, /gitleaks:latest/)
  })
})
