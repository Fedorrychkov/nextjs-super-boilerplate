import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { isEmailDeliverable, isOtpEmailAccepted, resolveEmailSendMode } from './email-mode'

describe('resolveEmailSendMode', () => {
  it('knows exactly three modes, case-insensitively, and reads an unset value as empty', () => {
    assert.equal(resolveEmailSendMode('console'), 'console')
    assert.equal(resolveEmailSendMode('Elastic '), 'elastic')
    assert.equal(resolveEmailSendMode('empty'), 'empty')
    assert.equal(resolveEmailSendMode(''), 'empty')
    assert.equal(resolveEmailSendMode(undefined), 'empty')
  })

  it('returns null for a typo — the case that used to fall through to the console provider silently', () => {
    assert.equal(resolveEmailSendMode('smtp'), null)
    assert.equal(resolveEmailSendMode('elastik'), null)
  })
})

describe('isEmailDeliverable', () => {
  it('is true only for elastic with a key', () => {
    assert.equal(isEmailDeliverable('elastic', 'key'), true)
    assert.equal(isEmailDeliverable('elastic', ''), false)
    assert.equal(isEmailDeliverable('console', 'key'), false)
    assert.equal(isEmailDeliverable('empty', 'key'), false)
    assert.equal(isEmailDeliverable('smtp', 'key'), false)
  })
})

describe('isOtpEmailAccepted', () => {
  it('accepts a real send and a console send — the code is in the log', () => {
    assert.equal(isOtpEmailAccepted({ sent: true }), true)
    assert.equal(isOtpEmailAccepted({ sent: false, skipped: true, reason: 'email_send_console' }), true)
  })

  it('rejects empty, unknown and failed — the user would wait for a code nobody delivered', () => {
    assert.equal(isOtpEmailAccepted({ sent: false, skipped: true, reason: 'email_not_configured' }), false)
    assert.equal(isOtpEmailAccepted({ sent: false, skipped: true, reason: 'email_mode_unknown' }), false)
    assert.equal(isOtpEmailAccepted({ sent: false, skipped: false, error: 'boom' }), false)
  })
})
