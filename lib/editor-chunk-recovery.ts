const RECOVERY_KEY = 'qmblog:editor-chunk-recovery'
const MAX_RECOVERIES = 2

export function getFailedEditorChunk(error: unknown): string | null {
  if (!(error instanceof Error) || error.name !== 'ChunkLoadError') return null
  const path = error.message.match(/Failed to load chunk (\/[^\s]+)/)?.[1]
  // Only cache same-site compiled scripts, never a URL supplied by article content.
  return path && /^\/_next\/static\/chunks\/[A-Za-z0-9_.~-]+\.js$/.test(path)
    ? path
    : null
}

export function resetEditorChunkRecovery() {
  try {
    sessionStorage.removeItem(RECOVERY_KEY)
  } catch {}
}

export async function recoverEditorChunk(error: unknown): Promise<boolean> {
  const path = getFailedEditorChunk(error)
  if (!path) return false
  try {
    const count = Number(sessionStorage.getItem(RECOVERY_KEY) || 0)
    if (!Number.isFinite(count) || count >= MAX_RECOVERIES) return false
    sessionStorage.setItem(RECOVERY_KEY, String(count + 1))
  } catch {
    // Without a persistent attempt counter, automatic reloads could loop.
    return false
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)
    try {
      const response = await fetch(path, {
        cache: 'reload',
        signal: controller.signal,
      })
      if (
        !response.ok ||
        !/javascript/.test(response.headers.get('content-type') || '')
      )
        return false
      // Headers alone do not prove a complete download (the original failure).
      const body = await response.arrayBuffer()
      if (body.byteLength === 0) return false
      return true
    } catch {
      // Retry a dropped connection with a fresh request, then expose manual retry.
    } finally {
      clearTimeout(timeout)
    }
  }
  return false
}
