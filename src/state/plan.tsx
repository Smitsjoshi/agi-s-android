import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AppState } from 'react-native'

import { apiFetch } from '@/lib/api'

/**
 * The plan and what is left of the allowance.
 *
 * Reads the same `/api/billing/me` the web app reads, so there is one notion of
 * a plan across both. Usage is two rolling windows — five hours and seven days
 * — reported as proportions rather than token counts, because "about half your
 * session, back in three hours" is actionable and "118,400 of 240,000" is not.
 *
 * ## Why a failure is not the free plan
 *
 * These used to be the same thing on the web, and when the database behind it
 * went down every signed-in person was quietly shown the free plan: paid
 * features gone, no error, nothing to act on. Features stay locked when this
 * fails — unlocking on an error is the one mistake that cannot be taken back —
 * but `unavailable` lets the UI say which happened.
 */

export type PlanId = 'free' | 'pro' | 'max'
export type Feature = 'chat' | 'deep-depth' | 'academic' | 'codex' | 'crucible' | 'catalyst' | 'workflows' | 'consensus'

export type Usage = {
  /** 0–1 of the five-hour window. */
  session: number
  /** 0–1 of the seven-day window. */
  week: number
  limiting: 'session' | 'week' | null
  refillsAt: string | null
  exhausted: boolean
}

type PlanState = {
  plan: PlanId
  unlocks: readonly Feature[]
  usage: Usage
  expiresAt: string | null
  loading: boolean
  unavailable: boolean
  locked: (feature: Feature) => boolean
  refresh: () => Promise<void>
  redeem: (code: string) => Promise<{ ok: boolean; message: string }>
}

const EMPTY_USAGE: Usage = { session: 0, week: 0, limiting: null, refillsAt: null, exhausted: false }

const Context = createContext<PlanState | null>(null)

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<PlanId>('free')
  const [unlocks, setUnlocks] = useState<readonly Feature[]>(['chat'])
  const [usage, setUsage] = useState<Usage>(EMPTY_USAGE)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const response = await apiFetch('/api/billing/me')
      if (!response.ok) {
        setUnavailable(true)
        setLoading(false)
        return
      }
      const data = (await response.json()) as {
        plan?: PlanId
        unlocks?: Feature[]
        usage?: Usage
        expiresAt?: string | null
      }
      setPlan(data.plan ?? 'free')
      setUnlocks(data.unlocks ?? ['chat'])
      setUsage(data.usage ?? EMPTY_USAGE)
      setExpiresAt(data.expiresAt ?? null)
      setUnavailable(false)
      setLoading(false)
    } catch {
      setUnavailable(true)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  /**
   * Re-read when the app comes back to the foreground.
   *
   * A phone app is backgrounded far more than a tab is, and often for hours.
   * Coming back to a stale allowance is the case where the figure is most wrong
   * and most likely to be trusted.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refresh()
    })
    return () => subscription.remove()
  }, [refresh])

  const redeem = useCallback(
    async (code: string) => {
      try {
        const response = await apiFetch('/api/billing/redeem', {
          method: 'POST',
          body: JSON.stringify({ code: code.trim() }),
        })
        const data = await response.json().catch(() => ({}) as Record<string, unknown>)
        if (!response.ok) {
          return { ok: false, message: String(data?.error ?? 'That code could not be used.') }
        }
        // The redeem response carries no usage, so re-read rather than
        // defaulting it to zero — which would show an empty meter as a reward.
        await refresh()
        return {
          ok: true,
          message: data?.plan === 'max' ? 'Max unlocked. Everything is open.' : 'Pro unlocked.',
        }
      } catch {
        return { ok: false, message: 'Could not reach the server.' }
      }
    },
    [refresh],
  )

  const value = useMemo<PlanState>(
    () => ({
      plan,
      unlocks,
      usage,
      expiresAt,
      loading,
      unavailable,
      locked: (feature: Feature) => !unlocks.includes(feature),
      refresh,
      redeem,
    }),
    [plan, unlocks, usage, expiresAt, loading, unavailable, refresh, redeem],
  )

  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function usePlan(): PlanState {
  const value = useContext(Context)
  if (!value) throw new Error('usePlan must be used inside PlanProvider')
  return value
}
