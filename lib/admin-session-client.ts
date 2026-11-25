'use client'

import { useSyncExternalStore } from 'react'

interface AdminSessionSnapshot {
  authenticated: boolean
  checked: boolean
}

const listeners = new Set<() => void>()
const ADMIN_HINT_COOKIE_NAME = 'qmblog_admin_hint'
let snapshot: AdminSessionSnapshot = {
  authenticated: false,
  checked: false,
}
let inflight: Promise<void> | null = null

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

function hasAdminSessionHint() {
  if (typeof document === 'undefined') return false
  return document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .some((cookie) => cookie.startsWith(`${ADMIN_HINT_COOKIE_NAME}=`))
}

function setAdminSessionHint(enabled: boolean) {
  if (typeof document === 'undefined') return
  // biome-ignore lint/suspicious/noDocumentCookie: intentional lightweight session hint cookie
  document.cookie = enabled
    ? `${ADMIN_HINT_COOKIE_NAME}=1; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
    : `${ADMIN_HINT_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`
}

async function loadAdminSession(force = false) {
  if (!force && inflight) {
    return inflight
  }

  const request = (async () => {
    try {
      const response = await fetch('/api/admin/session', {
        cache: 'no-store',
        credentials: 'include',
      })
      const data = (await response.json().catch(() => ({}))) as {
        authenticated?: boolean
      }

      snapshot = {
        authenticated: Boolean(response.ok && data.authenticated),
        checked: true,
      }
      setAdminSessionHint(snapshot.authenticated)
    } catch {
      snapshot = {
        authenticated: false,
        checked: true,
      }
      setAdminSessionHint(false)
    } finally {
      emitChange()
    }
  })()

  inflight = request.finally(() => {
    if (inflight === request) {
      inflight = null
    }
  })

  return inflight
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange)

  if (!snapshot.checked && !inflight) {
    if (hasAdminSessionHint()) {
      void loadAdminSession()
    } else {
      snapshot = {
        authenticated: false,
        checked: true,
      }
      queueMicrotask(emitChange)
    }
  }

  return () => {
    listeners.delete(onStoreChange)
  }
}

function getSnapshot() {
  return snapshot
}

export async function refreshAdminSession() {
  await loadAdminSession(true)
}

export function useAdminSession() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return {
    ...state,
    refresh: refreshAdminSession,
  }
}
