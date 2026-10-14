import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type Auth,
  type User,
} from 'firebase/auth'
// @ts-expect-error — not in the published types, but it is the documented RN entry point.
import { getReactNativePersistence, initializeAuth } from 'firebase/auth'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { apiUrl, setToken } from '@/lib/api'

/**
 * Who is signed in.
 *
 * ## Why the Firebase config is fetched rather than bundled
 *
 * The server already serves it at `/api/auth/config`, and the web app reads it
 * from there. Doing the same means one place to change a project, and it means
 * a config change does not need an App Store review — which, for a value that
 * has to match the backend exactly, is the difference between a five-minute fix
 * and a five-day one.
 *
 * ## Why the token is pushed into the API layer
 *
 * Firebase ID tokens expire after an hour. `getIdToken()` refreshes silently,
 * so the token is re-read on every auth state change and written to the
 * keychain, and `api.ts` reads it from there. A token captured once at sign-in
 * works for an hour and then produces 401s that look like being signed out.
 */

type AuthState = {
  user: User | null
  /** Still working out whether there is a session. Not the same as signed out. */
  loading: boolean
  /** The server has no Firebase project, or could not be reached. */
  unavailable: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

const Context = createContext<AuthState | null>(null)

let app: FirebaseApp | null = null
let auth: Auth | null = null

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const response = await fetch(apiUrl('/api/auth/config'))

        if (response.status === 429) {
          // Temporary and self-healing. Saying "not configured" here sends
          // somebody to fix a server that is perfectly correct.
          if (!cancelled) {
            setUnavailable('Too many requests from this network. Try again in a minute.')
            setLoading(false)
          }
          return
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const data = (await response.json()) as {
          configured?: boolean
          firebase?: { apiKey: string; authDomain: string; projectId: string }
        }

        if (!data.configured || !data.firebase) {
          if (!cancelled) {
            setUnavailable('Sign-in is not available right now.')
            setLoading(false)
          }
          return
        }

        if (!app) {
          app = getApps()[0] ?? initializeApp(data.firebase)
          /**
           * `initializeAuth` with AsyncStorage persistence, not `getAuth`.
           *
           * On React Native `getAuth` keeps the session in memory only, so the
           * user is signed out every cold start — which reads as the app
           * logging you out at random. The ID token still lives in the
           * keychain; this is Firebase's own refresh state, which is not a
           * credential on its own.
           */
          auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
        }

        const unsubscribe = onAuthStateChanged(auth!, async (next) => {
          if (cancelled) return
          setUser(next)
          await setToken(next ? await next.getIdToken() : null)
          setLoading(false)
        })

        return () => unsubscribe()
      } catch {
        if (!cancelled) {
          setUnavailable('Could not reach AGI-S. Check your connection.')
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  /**
   * Refresh the token before it expires.
   *
   * An hour-long token on a long-lived app means a user who leaves the app open
   * comes back to 401s. Forcing a refresh every fifty minutes keeps the
   * keychain copy valid without waiting for a failure to notice.
   */
  useEffect(() => {
    if (!user) return
    const timer = setInterval(
      () => void user.getIdToken(true).then((token) => setToken(token)).catch(() => {}),
      50 * 60_000,
    )
    return () => clearInterval(timer)
  }, [user])

  const need = () => {
    if (!auth) throw new Error('Sign-in is not ready yet.')
    return auth
  }

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(need(), email.trim(), password)
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    await createUserWithEmailAndPassword(need(), email.trim(), password)
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(need(), email.trim())
  }, [])

  const signOut = useCallback(async () => {
    await setToken(null)
    if (auth) await fbSignOut(auth)
  }, [])

  const value = useMemo<AuthState>(
    () => ({ user, loading, unavailable, signIn, signUp, resetPassword, signOut }),
    [user, loading, unavailable, signIn, signUp, resetPassword, signOut],
  )

  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useAuth(): AuthState {
  const value = useContext(Context)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
