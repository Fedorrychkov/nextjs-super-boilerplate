/**
 * Reload after a failed refresh — at most once a minute per tab. Without it, any request a guest
 * makes to a protected endpoint went 401 → refresh 401 → reload → the same request, forever (a
 * descendant's landing page reloaded every few seconds in October 2026).
 */
export const RELOAD_GUARD_KEY = 'auth-refresh-reload-at'
export const RELOAD_GUARD_MS = 60_000

type SessionStore = Pick<Storage, 'getItem' | 'setItem'>

export function reloadAllowed(store: SessionStore, now: number): boolean {
  try {
    const last = store.getItem(RELOAD_GUARD_KEY)

    if (last !== null && now - Number(last) < RELOAD_GUARD_MS) return false

    store.setItem(RELOAD_GUARD_KEY, String(now))

    return true
  } catch {
    // Storage unavailable (private mode, cookies blocked): with no memory of the last attempt the
    // reload would loop again, so do not reload at all.
    return false
  }
}
