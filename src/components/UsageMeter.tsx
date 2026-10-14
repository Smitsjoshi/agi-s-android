import { StyleSheet, Text, View } from 'react-native'

import { usePlan } from '@/state/plan'
import { color, line, radius, space, type } from '@/theme'

/**
 * What is left, as a proportion.
 *
 * Two bars because they mean different things: a full session bar is "come back
 * this evening", a full week bar is "come back Tuesday". One number would hide
 * which is true.
 *
 * Three colour bands rather than a gradient — a sliding hue gives the reader a
 * colour to interpret; three bands give them a decision: fine, plan ahead, act
 * now. Warned at 80%, because a ceiling you discover by hitting it is a
 * cancellation and the same ceiling announced early is a feature.
 */
function Bar({ label, used, hint }: { label: string; used: number; hint: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, used)) * 100)
  const tone = pct >= 100 ? color.breached500 : pct >= 80 ? color.degraded500 : color.iris500

  return (
    <View style={{ marginBottom: space(4) }}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.pct}>{pct}%</Text>
      </View>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: pct }}
      >
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: tone }]} />
      </View>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  )
}

export function UsageMeter() {
  const { plan, usage, unavailable } = usePlan()

  if (unavailable) {
    return (
      <View style={styles.card}>
        <Text style={styles.note}>
          Your plan could not be loaded. It is a connection problem, not a change to your account.
        </Text>
      </View>
    )
  }

  const close = usage.session >= 0.8 || usage.week >= 0.8

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>Your usage</Text>
        <Text style={styles.plan}>{plan.toUpperCase()}</Text>
      </View>

      <View style={{ marginTop: space(4) }}>
        <Bar label="This session" used={usage.session} hint="Refills continuously over five hours." />
        <Bar label="This week" used={usage.week} hint="Refills continuously over seven days." />
      </View>

      {usage.exhausted ? (
        <Text style={[styles.note, { color: color.breached300 }]}>
          Your {usage.limiting === 'week' ? 'weekly' : 'session'} allowance is used. It refills on its own.
        </Text>
      ) : close ? (
        <Text style={[styles.note, { color: color.degraded300 }]}>
          Close to your {usage.session >= 0.8 ? 'session' : 'weekly'} limit. Nothing stops suddenly.
        </Text>
      ) : null}

      <Text style={styles.footnote}>
        Two rolling windows rather than a monthly pool, so there is no date to dread — run out in the
        afternoon and some is back the same evening. Deeper answers use more.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: line.faint, borderRadius: radius.lg, padding: space(4) },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { color: color.fog50, fontSize: 15, fontWeight: '600', fontFamily: type.sans },
  plan: { color: color.fog500, fontSize: 11, letterSpacing: 1, fontFamily: type.sans },
  label: { color: color.fog200, fontSize: 13.5, fontFamily: type.sans },
  pct: { color: color.fog500, fontSize: 12, fontVariant: ['tabular-nums'], fontFamily: type.sans },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: space(1.5), overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  hint: { color: color.fog500, fontSize: 11.5, marginTop: space(1), fontFamily: type.sans },
  note: { color: color.fog300, fontSize: 12.5, lineHeight: 19, marginTop: space(2), fontFamily: type.sans },
  footnote: { color: color.fog500, fontSize: 11.5, lineHeight: 18, marginTop: space(3), fontFamily: type.sans },
})
