/**
 * The four answering depths, mirroring the web app exactly.
 *
 * Same ids, because the id is what the server receives — a different string
 * here would be silently ignored and the answer would arrive at the default
 * depth with nothing to say it had.
 *
 * `gated` marks the two the server refuses on the free plan. It lowers them to
 * balanced and sends a `depth` event saying so, so the client can explain
 * rather than appear to ignore the setting.
 */
export type DepthId = 'fast' | 'balanced' | 'deep' | 'maximum'

export type Depth = {
  id: DepthId
  name: string
  blurb: string
  /** Requires a paid plan. The server is the enforcement; this is the label. */
  gated: boolean
}

export const DEPTHS: readonly Depth[] = [
  { id: 'fast', name: 'Fast', blurb: 'Answers first. Lookups and quick questions.', gated: false },
  { id: 'balanced', name: 'Balanced', blurb: 'Thinks briefly, then gets on with it.', gated: false },
  { id: 'deep', name: 'Deep', blurb: 'Works the problem. Analysis and multi-step tasks.', gated: true },
  { id: 'maximum', name: 'Maximum', blurb: 'Most reasoning. Hard logic, planning, difficult problems.', gated: true },
]

export const DEFAULT_DEPTH: DepthId = 'balanced'

export const findDepth = (id: string | null | undefined): Depth =>
  DEPTHS.find((d) => d.id === id) ?? DEPTHS[1]
