import { useState } from 'react'
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

import { UsageMeter } from '@/components/UsageMeter'
import { usePlan } from '@/state/plan'
import { color, line, radius, space, type } from '@/theme'

const CONTACT = 'businesswithsmitjoshi@gmail.com'
const SITE = 'https://agi-s-site.onrender.com/pricing'

/**
 * Plans, without a paywall.
 *
 * ## Why there is no Buy button
 *
 * Apple and Google require their own billing for digital subscriptions sold
 * inside an app, and take 30%. Linking out to a web checkout to avoid that
 * breaks Apple's rules and is a common rejection. Until payments exist at all,
 * the honest version is this: show what each plan is, let a code be redeemed,
 * and point at the web for anything involving money.
 *
 * A fake Buy button that opens a browser would risk the listing for no revenue.
 */

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 'No cost',
    lines: ['Chat at Fast and Balanced depth', 'Memory and plugins', 'A sensible volume, permanently'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$14 a month',
    lines: ['Everything in Free', 'Deep and Maximum depth', 'Academic research', '6× the usage of Free'],
  },
  {
    id: 'max',
    name: 'Max',
    price: '$56 a month',
    lines: ['Everything in Pro', 'Workflows and consensus', '10× the usage of Pro'],
  },
] as const

export function PlansScreen() {
  const { plan, redeem } = usePlan()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const submit = async () => {
    if (!code.trim() || busy) return
    setBusy(true)
    setResult(await redeem(code))
    setBusy(false)
    setCode('')
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: space(4), paddingBottom: space(12) }}>
      <UsageMeter />

      <Text style={styles.heading}>Plans</Text>

      {PLANS.map((entry) => {
        const current = entry.id === plan
        return (
          <View key={entry.id} style={[styles.card, current && styles.cardCurrent]}>
            <View style={styles.cardTop}>
              <Text style={styles.name}>{entry.name}</Text>
              {current && <Text style={styles.badge}>Your plan</Text>}
            </View>
            <Text style={styles.price}>{entry.price}</Text>
            {entry.lines.map((item) => (
              <Text key={item} style={styles.line}>• {item}</Text>
            ))}
          </View>
        )
      })}

      <View style={styles.card}>
        <Text style={styles.name}>Have a code?</Text>
        <View style={styles.codeRow}>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="Enter a promo code"
            placeholderTextColor={color.fog500}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            onSubmitEditing={submit}
          />
          <Pressable onPress={submit} disabled={busy || !code.trim()} style={({ pressed }) => [styles.apply, (busy || !code.trim()) && { opacity: 0.45 }, pressed && { opacity: 0.8 }]}>
            <Text style={styles.applyText}>{busy ? '…' : 'Apply'}</Text>
          </Pressable>
        </View>
        {result && (
          <Text style={[styles.result, { color: result.ok ? color.held300 : color.breached300 }]}>{result.message}</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.name}>Upgrading</Text>
        <Text style={styles.body}>
          Paid plans are arranged on the web for now, not in the app. Open the pricing page, or email
          and it gets set up by hand — usually within a day.
        </Text>
        <Pressable onPress={() => void Linking.openURL(SITE)} style={styles.secondary}>
          <Text style={styles.secondaryText}>Open pricing on the web</Text>
        </Pressable>
        <Pressable onPress={() => void Linking.openURL(`mailto:${CONTACT}?subject=AGI-S%20plan`)} style={styles.secondary}>
          <Text style={styles.secondaryText}>{CONTACT}</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.ink950 },
  heading: { color: color.fog50, fontSize: 18, fontWeight: '600', marginTop: space(7), marginBottom: space(3), fontFamily: type.sans },
  card: { borderWidth: 1, borderColor: line.faint, borderRadius: radius.lg, padding: space(4), marginBottom: space(3) },
  cardCurrent: { borderColor: color.iris500 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { color: color.fog50, fontSize: 15.5, fontWeight: '600', fontFamily: type.sans },
  badge: { color: color.iris300, fontSize: 11, letterSpacing: 0.6, fontFamily: type.sans },
  price: { color: color.fog300, fontSize: 14, marginTop: space(1), marginBottom: space(2.5), fontFamily: type.sans },
  line: { color: color.fog400, fontSize: 13.5, lineHeight: 21, fontFamily: type.sans },
  body: { color: color.fog400, fontSize: 13.5, lineHeight: 21, marginTop: space(2), fontFamily: type.sans },
  codeRow: { flexDirection: 'row', gap: space(2), marginTop: space(3) },
  input: {
    flex: 1,
    backgroundColor: color.ink850,
    borderWidth: 1,
    borderColor: line.soft,
    borderRadius: radius.md,
    paddingHorizontal: space(3),
    paddingVertical: space(2.5),
    color: color.fog50,
    fontFamily: type.sans,
  },
  apply: { backgroundColor: color.iris500, borderRadius: radius.md, paddingHorizontal: space(4), justifyContent: 'center' },
  applyText: { color: '#fff', fontWeight: '600', fontFamily: type.sans },
  result: { fontSize: 13, marginTop: space(2.5), fontFamily: type.sans },
  secondary: {
    borderWidth: 1,
    borderColor: line.soft,
    borderRadius: radius.md,
    paddingVertical: space(3),
    alignItems: 'center',
    marginTop: space(3),
  },
  secondaryText: { color: color.fog200, fontSize: 13.5, fontFamily: type.sans },
})
