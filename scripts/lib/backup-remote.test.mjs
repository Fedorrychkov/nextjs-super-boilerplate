// Разбор MONGO_BACKUP_REMOTE в настройки rclone: ошибка здесь — бэкап, который «уехал» не туда
// или молча не уехал никуда, а заметят это в день, когда он понадобится.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const lib = join(dirname(fileURLToPath(import.meta.url)), 'backup-remote.sh')

const run = (env) => {
  const out = join(mkdtempSync(join(tmpdir(), 'bp-remote-')), 'rclone.env')
  const result = spawnSync('bash', ['-c', `. "${lib}"; backup_remote_rclone_env "${out}"`], {
    env: { PATH: process.env.PATH, ...env },
    encoding: 'utf8',
  })
  let file = null
  let mode = null

  try {
    file = readFileSync(out, 'utf8')
    mode = statSync(out).mode & 0o777
  } catch {
    // no file written
  }

  return { code: result.status, target: result.stdout.trim(), stderr: result.stderr, file, mode }
}

const s3Keys = { MONGO_BACKUP_S3_ACCESS_KEY_ID: 'AKID', MONGO_BACKUP_S3_SECRET_ACCESS_KEY: 'se/cr+et' }

describe('backup_remote_rclone_env', () => {
  it('is "not configured" when the remote is empty: the dump stays on the server only', () => {
    const r = run({})

    assert.equal(r.code, 2)
    assert.equal(r.file, null)
  })

  it('S3-compatible storage with an endpoint: provider Other, keys only in a 0600 file', () => {
    const r = run({ MONGO_BACKUP_REMOTE: 's3://backups/prod/', MONGO_BACKUP_S3_ENDPOINT: 'https://storage.example.net', MONGO_BACKUP_S3_REGION: 'ru-central1', ...s3Keys })

    assert.equal(r.code, 0)
    assert.equal(r.target, 'dest:backups/prod')
    assert.equal(r.mode, 0o600)
    assert.match(r.file, /^RCLONE_CONFIG_DEST_TYPE=s3$/m)
    assert.match(r.file, /^RCLONE_CONFIG_DEST_PROVIDER=Other$/m)
    assert.match(r.file, /^RCLONE_CONFIG_DEST_ENDPOINT=https:\/\/storage\.example\.net$/m)
    assert.match(r.file, /^RCLONE_CONFIG_DEST_REGION=ru-central1$/m)
    assert.match(r.file, /^RCLONE_CONFIG_DEST_SECRET_ACCESS_KEY=se\/cr\+et$/m)
    assert.ok(!r.target.includes('AKID'))
  })

  it('AWS itself when no endpoint is given', () => {
    const r = run({ MONGO_BACKUP_REMOTE: 's3://bucket', ...s3Keys })

    assert.equal(r.target, 'dest:bucket')
    assert.match(r.file, /^RCLONE_CONFIG_DEST_PROVIDER=AWS$/m)
    assert.doesNotMatch(r.file, /ENDPOINT/)
  })

  it('refuses S3 without keys', () => {
    const r = run({ MONGO_BACKUP_REMOTE: 's3://bucket' })

    assert.equal(r.code, 1)
    assert.match(r.stderr, /ACCESS_KEY_ID/)
  })

  it('another server over SFTP: user, host, port, absolute path, key on one line', () => {
    const r = run({ MONGO_BACKUP_REMOTE: 'sftp://backup@10.0.0.5:2222/srv/dumps/', MONGO_BACKUP_SFTP_KEY_PEM: '-----BEGIN KEY-----\\nabc\\n-----END KEY-----' })

    assert.equal(r.code, 0)
    assert.equal(r.target, 'dest:/srv/dumps')
    assert.match(r.file, /^RCLONE_CONFIG_DEST_HOST=10\.0\.0\.5$/m)
    assert.match(r.file, /^RCLONE_CONFIG_DEST_PORT=2222$/m)
    assert.match(r.file, /^RCLONE_CONFIG_DEST_USER=backup$/m)
    assert.match(r.file, /^RCLONE_CONFIG_DEST_KEY_PEM=-----BEGIN KEY-----\\nabc\\n-----END KEY-----$/m)
    assert.doesNotMatch(r.file, /KNOWN_HOSTS/)
  })

  it('defaults the SFTP port to 22 and pins the host key when one is given', () => {
    const r = run({ MONGO_BACKUP_REMOTE: 'sftp://u@host/dumps', MONGO_BACKUP_SFTP_KEY_PEM: 'k', MONGO_BACKUP_SFTP_KNOWN_HOSTS_FILE: '/home/x/.kh' })

    assert.match(r.file, /^RCLONE_CONFIG_DEST_PORT=22$/m)
    assert.match(r.file, /^RCLONE_CONFIG_DEST_KNOWN_HOSTS_FILE=\/config\/known_hosts$/m)
  })

  it('refuses malformed addresses and SFTP without a key', () => {
    for (const remote of ['sftp://host/path', 'sftp://u@host', 'sftp://u@host:abc/p', 's3://', 's3:///x', 'ftp://h/p', 'gs://b']) {
      assert.equal(run({ MONGO_BACKUP_REMOTE: remote, MONGO_BACKUP_SFTP_KEY_PEM: 'k', ...s3Keys }).code, 1, remote)
    }

    assert.equal(run({ MONGO_BACKUP_REMOTE: 'sftp://u@h/p' }).code, 1)
  })
})
