import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { containerMongoFindings, containerRedisFindings, mongoHostFromUri, redisHostFromUrl } from './container-topology'

describe('mongoHostFromUri', () => {
  it('reads the host past credentials and before port/path/query', () => {
    assert.equal(mongoHostFromUri('mongodb://admin:p%40ss@mongo:27017/app?authSource=admin'), 'mongo')
    assert.equal(mongoHostFromUri('mongodb://localhost:27017/app?directConnection=true'), 'localhost')
    assert.equal(mongoHostFromUri('mongodb+srv://u:p@cluster0.abc.mongodb.net/app'), 'cluster0.abc.mongodb.net')
    assert.equal(mongoHostFromUri('mongodb://h1:27017,h2:27017/app?replicaSet=rs0'), 'h1')
  })

  it('reads a bracketed IPv6 host without the brackets', () => {
    assert.equal(mongoHostFromUri('mongodb://[::1]:27017/app'), '::1')
    assert.equal(mongoHostFromUri('mongodb://u:p@[fd00::5]:27017/app'), 'fd00::5')
  })

  it('returns null for a string that is not a mongo URI', () => {
    assert.equal(mongoHostFromUri('postgres://x'), null)
    assert.equal(mongoHostFromUri(''), null)
  })
})

describe('containerMongoFindings', () => {
  const creds = { user: 'admin', password: 'secret' }

  it('is silent when mongo is external — there the host may legitimately be anything', () => {
    assert.deepEqual(containerMongoFindings({ mongoEnabled: false, uri: 'mongodb://localhost:27017/app' }), [])
  })

  it('flags localhost in the URI: the way the first stage deploy died', () => {
    const findings = containerMongoFindings({ mongoEnabled: true, uri: 'mongodb://admin:x@localhost:27017/app?authSource=admin' })

    assert.equal(findings.length, 1)
    assert.match(findings[0], /localhost/)
    assert.equal(containerMongoFindings({ mongoEnabled: true, uri: 'mongodb://admin:x@[::1]:27017/app?authSource=admin' }).length, 1)
  })

  it('flags localhost coming from MONGO_HOST when the URI is empty, including the config default', () => {
    assert.equal(containerMongoFindings({ mongoEnabled: true, uri: '', host: '127.0.0.1', ...creds }).length, 1)
    assert.equal(containerMongoFindings({ mongoEnabled: true, uri: '', ...creds }).length, 1)
    assert.deepEqual(containerMongoFindings({ mongoEnabled: true, uri: '', host: 'mongo', ...creds }), [])
  })

  it('demands MONGO_USER and MONGO_PASSWORD when the fields assemble the URI — the container always has a root user', () => {
    assert.match(containerMongoFindings({ mongoEnabled: true, uri: '', host: 'mongo' })[0], /MONGO_USER and MONGO_PASSWORD/)
    assert.match(containerMongoFindings({ mongoEnabled: true, uri: '', host: 'mongo', user: 'admin' })[0], /MONGO_USER and MONGO_PASSWORD/)
  })

  it('flags a URI without credentials regardless of MONGO_USER — the root user exists either way', () => {
    for (const input of [{}, creds]) {
      const findings = containerMongoFindings({ mongoEnabled: true, uri: 'mongodb://mongo:27017/app', ...input })

      assert.equal(findings.length, 1)
      assert.match(findings[0], /no credentials/)
    }
  })

  it('flags credentials without authSource=admin — the root user does not live in the app database', () => {
    const findings = containerMongoFindings({ mongoEnabled: true, uri: 'mongodb://admin:x@mongo:27017/app', ...creds })

    assert.equal(findings.length, 1)
    assert.match(findings[0], /authSource/)
  })

  it('accepts the fully specified container URI, and a URI whose path database is admin itself', () => {
    assert.deepEqual(
      containerMongoFindings({ mongoEnabled: true, uri: 'mongodb://admin:x@mongo:27017/app?authSource=admin&directConnection=true', ...creds }),
      [],
    )
    assert.deepEqual(containerMongoFindings({ mongoEnabled: true, uri: 'mongodb://admin:x@mongo:27017/admin' }), [])
  })
})

describe('redisHostFromUrl', () => {
  it('reads the host past credentials, with and without a port', () => {
    assert.equal(redisHostFromUrl('redis://redis:6379'), 'redis')
    assert.equal(redisHostFromUrl('redis://:secret@localhost:6388/0'), 'localhost')
    assert.equal(redisHostFromUrl('rediss://user:pw@cache.example.com'), 'cache.example.com')
    assert.equal(redisHostFromUrl('redis://[::1]:6379'), '::1')
  })

  it('returns null for a string that is not a redis URL', () => {
    assert.equal(redisHostFromUrl('http://redis'), null)
    assert.equal(redisHostFromUrl(''), null)
  })
})

describe('containerRedisFindings', () => {
  it('is silent when redis is external or unset — an empty REDIS_URL is a different doctor check', () => {
    assert.deepEqual(containerRedisFindings({ redisEnabled: false, url: 'redis://localhost:6379' }), [])
    assert.deepEqual(containerRedisFindings({ redisEnabled: true, url: '' }), [])
  })

  it('flags localhost: the way the first successful stage deploy shipped without a worker', () => {
    const findings = containerRedisFindings({ redisEnabled: true, url: 'redis://localhost:6379' })

    assert.equal(findings.length, 1)
    assert.match(findings[0], /localhost/)
    assert.equal(containerRedisFindings({ redisEnabled: true, url: 'redis://127.0.0.1:6379' }).length, 1)
    assert.equal(containerRedisFindings({ redisEnabled: true, url: 'redis://[::1]:6379' }).length, 1)
  })

  it('accepts the compose service name', () => {
    assert.deepEqual(containerRedisFindings({ redisEnabled: true, url: 'redis://redis:6379' }), [])
  })
})
