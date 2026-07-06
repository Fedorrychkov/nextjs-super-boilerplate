import { useCallback, useSyncExternalStore } from 'react'

/**
 * Cross-layout store for sidebar collapsible-section open state.
 *
 * Holds only the **user override** per section id (`true` = user opened, `false` = user collapsed,
 * `undefined` = untouched → automatic behavior driven by the active URL / `defaultOpen`).
 *
 * The store is module-level (survives sidebar remounts when switching between route-group layouts)
 * and mirrored to `sessionStorage`, so it also survives full page reloads but resets on a new tab/session.
 */

const STORAGE_KEY = 'nsb.sidebar.sections'

type SidebarSectionState = Record<string, boolean>

let state: SidebarSectionState = {}
let hydrated = false
const listeners = new Set<() => void>()

function readStorage(): SidebarSectionState {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)

    return raw ? (JSON.parse(raw) as SidebarSectionState) : {}
  } catch {
    return {}
  }
}

function writeStorage(next: SidebarSectionState): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore storage write failures (private mode, quota, disabled)
  }
}

function ensureHydrated(): void {
  if (!hydrated && typeof window !== 'undefined') {
    state = readStorage()
    hydrated = true
  }
}

function emit(): void {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

/** Read the current user override for a section (`undefined` = untouched). */
export function getSidebarSectionOverride(id: string): boolean | undefined {
  ensureHydrated()

  return state[id]
}

/** Persist a user override for a section and notify subscribers. */
export function setSidebarSectionOverride(id: string, open: boolean): void {
  ensureHydrated()
  state = { ...state, [id]: open }
  writeStorage(state)
  emit()
}

/**
 * Subscribe a component to a single section's override.
 * Returns the current override (`boolean | undefined`) and a setter.
 * SSR / first hydration render always yields `undefined` to avoid mismatches.
 */
export function useSidebarSectionOverride(id: string): [boolean | undefined, (open: boolean) => void] {
  const override = useSyncExternalStore(
    subscribe,
    () => getSidebarSectionOverride(id),
    () => undefined,
  )

  const setOverride = useCallback((open: boolean) => setSidebarSectionOverride(id, open), [id])

  return [override, setOverride]
}
