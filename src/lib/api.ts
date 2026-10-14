import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'

/**
 * Talking to the same server the web app talks to.
 *
 * There is no mobile-specific backend and there should not be one. The API is
 * REST plus SSE with a bearer token, which is exactly as usable from a phone as
 * from a browser — so entitlements, promo codes, usage windows, memory and the
 * depth system all work here without a line of server change.
 *
 * ## Why the base URL is configuration rather than a constant
 *
 * The web app can use a relative `/api/...` because it is served by the same
 * process. A phone has no origin to be relative to, so the address has to be
 * absolute, and an absolute address baked into a binary is one that cannot be
 * changed without an App Store review. It comes from `app.json` → `extra`,
 * which `eas build --profile` can override per environment.
 */

const CONFIGURED = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl

export const API_BASE = (CONFIGURED ?? 'https://agi-s.onrender.com').replace(/\/$/, '')

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
}

/* ── The token ───────────────────────────────────────────────────────────── */

/**
 * Held in the keychain, not in AsyncStorage.
 *
 * AsyncStorage is a plain file in the app's sandbox: readable on a rooted or
 * jailbroken device, and included in an unencrypted iTunes backup. A bearer
 * token is a key to someone's whole account, so it belongs in the system
 * keystore, which is what `expo-secure-store` wraps.
 */
const TOKEN_KEY = 'agis.session.token'

let cached: string | null = null

export async function getToken(): Promise<string | null> {
  if (cached) return cached
  try {
    cached = await SecureStore.getItemAsync(TOKEN_KEY)
  } catch {
    // The keystore can be unavailable before first unlock. Treat it as signed
    // out rather than crashing the app on a cold launch from a notification.
    cached = null
  }
  return cached
}

export async function setToken(token: string | null): Promise<void> {
  cached = token
  try {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token)
    else await SecureStore.deleteItemAsync(TOKEN_KEY)
  } catch {
    /* Nothing useful to do; the in-memory copy still serves this session. */
  }
}

/* ── Requests ────────────────────────────────────────────────────────────── */

export class ApiError extends Error {
  status: number
  code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

/**
 * `fetch`, with the token attached and a timeout.
 *
 * A timeout here, and deliberately none on the streaming path: a phone changing
 * from wifi to cellular leaves a request hanging forever with no error, and a
 * spinner that never resolves is the worst failure a mobile app can show. The
 * streaming path is different because a long answer is *supposed* to take
 * minutes.
 */
export async function apiFetch(path: string, init: RequestInit = {}, timeoutMs = 20_000): Promise<Response> {
  const token = await getToken()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(apiUrl(path), {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    })
  } finally {
    clearTimeout(timer)
  }
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, init)
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    let code: string | undefined
    try {
      const body = await response.json()
      if (body?.error) message = String(body.error)
      if (body?.code) code = String(body.code)
    } catch {
      /* Non-JSON error body; the status stands. */
    }
    throw new ApiError(message, response.status, code)
  }
  return (await response.json()) as T
}
