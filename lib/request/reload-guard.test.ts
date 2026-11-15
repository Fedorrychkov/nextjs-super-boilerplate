import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { RELOAD_GUARD_MS, reloadAllowed } from './reload-guard'

const memoryStore = () => {
  const data = new Map<string, string>()

  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value) }
}

describe('reloadAllowed', () => {
  it('allows the first reload and refuses another within the window', () => {
    const store = memoryStore()

    assert.equal(reloadAllowed(store, 1_000), true)
    assert.equal(reloadAllowed(store, 1_000 + RELOAD_GUARD_MS - 1), false)
    assert.equal(reloadAllowed(store, 1_000 + RELOAD_GUARD_MS), true)
  })

  it('never reloads when storage is unavailable — that is what looped', () => {
    const broken = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => undefined,
    }

    assert.equal(reloadAllowed(broken, 1_000), false)
  })
})
