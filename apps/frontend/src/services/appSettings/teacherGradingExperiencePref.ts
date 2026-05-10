import { useSyncExternalStore } from 'react'

let cached = ''
const listeners = new Set<() => void>()

function emit(): void {
  for (const cb of listeners) cb()
}

export function setTeacherGradingExperienceCache(text: string): void {
  cached = text
  emit()
}

export function getTeacherGradingExperienceCached(): string {
  return cached
}

export function subscribeTeacherGradingExperiencePref(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)
  return () => listeners.delete(onStoreChange)
}

export function useTeacherGradingExperiencePref(): string {
  return useSyncExternalStore(
    subscribeTeacherGradingExperiencePref,
    getTeacherGradingExperienceCached,
    getTeacherGradingExperienceCached
  )
}
