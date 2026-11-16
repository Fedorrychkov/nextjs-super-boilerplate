import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const lib = fileURLToPath(new URL('./deploy-utils.sh', import.meta.url))

test('disabled migrations return a numeric rollback count, not a log message', () => {
  const result = spawnSync('bash', ['-c', 'source "$1"; MIGRATIONS_RUN=false; run_migrations_flow local', 'bash', lib], {
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout, '0\n')
  assert.match(result.stderr, /Skipping/)
})
