import { createBrowserClient } from '@supabase/ssr'

let _client: ReturnType<typeof createBrowserClient> | null = null

// navigator.locks throws AbortError "lock stolen" in React Strict Mode because
// double-mount fires two concurrent getUser() calls on the same client.
// A Promise queue is functionally identical for single-tab use (no cross-tab needed).
function makeLock() {
  let tail: Promise<unknown> = Promise.resolve()
  return (_name: string, _timeout: number, fn: () => Promise<unknown>) => {
    const result = tail.then(() => fn())
    tail = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }
}

export function createClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { auth: { lock: makeLock() as any } },
    )
  }
  return _client
}

export function useSupabase() {
  return createClient()
}
