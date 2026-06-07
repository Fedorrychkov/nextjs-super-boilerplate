const STORAGE_PREFIX = 'onboarding-modal-seen'

export function getOnboardingModalStorageKey(version: number): string {
  return `${STORAGE_PREFIX}:v${version}`
}

export function isOnboardingModalSeen(version: number): boolean {
  if (typeof globalThis.localStorage === 'undefined') {
    return false
  }

  return globalThis.localStorage.getItem(getOnboardingModalStorageKey(version)) === '1'
}

export function markOnboardingModalSeen(version: number): void {
  if (typeof globalThis.localStorage === 'undefined') {
    return
  }

  globalThis.localStorage.setItem(getOnboardingModalStorageKey(version), '1')
}
