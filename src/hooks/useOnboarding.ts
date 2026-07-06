const STORAGE_PREFIX = 'chaqqon_onboarding_seen_'

export function hasSeenOnboarding(key: string): boolean {
  return localStorage.getItem(STORAGE_PREFIX + key) === '1'
}

export function markOnboardingSeen(key: string) {
  localStorage.setItem(STORAGE_PREFIX + key, '1')
}

export function resetOnboarding(key: string) {
  localStorage.removeItem(STORAGE_PREFIX + key)
}
