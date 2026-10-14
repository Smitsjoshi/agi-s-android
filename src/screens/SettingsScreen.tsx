import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { UsageMeter } from '@/components/UsageMeter'
import { useAuth } from '@/state/auth'
import { color, line, radius, space, type } from '@/theme'

export function SettingsScreen({ onOpenPlans }: { onOpenPlans: () => void }) {
  const { user, signOut } = useAuth()

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'Your conversations stay on your account.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ])
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: space(4), paddingBottom: space(12) }}>
      <View style={styles.card}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value}>{user?.email ?? 'Unknown'}</Text>
      </View>

      <UsageMeter />

      <Pressable onPress={onOpenPlans} style={styles.action}>
        <Text style={styles.actionText}>Plans and promo codes</Text>
      </Pressable>

      <Pressable onPress={confirmSignOut} style={[styles.action, { marginTop: space(3) }]}>
        <Text style={[styles.actionText, { color: color.breached300 }]}>Sign out</Text>
      </Pressable>

      {/*
        CodeX, Workflows, Crucible and Catalyst are missing on purpose, and
        saying so is better than letting someone hunt for them. A file tree, a
        canvas and a long workspace session are desktop interactions.
      */}
      <Text style={styles.note}>
        CodeX, Workflows, Crucible and Catalyst are on the web app — they need a
        screen with room for a file tree and a canvas.
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.ink950 },
  card: { borderWidth: 1, borderColor: line.faint, borderRadius: radius.lg, padding: space(4), marginBottom: space(3) },
  label: { color: color.fog500, fontSize: 11.5, letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: type.sans },
  value: { color: color.fog50, fontSize: 15, marginTop: space(1), fontFamily: type.sans },
  action: {
    borderWidth: 1,
    borderColor: line.soft,
    borderRadius: radius.md,
    paddingVertical: space(3.5),
    alignItems: 'center',
    marginTop: space(3),
  },
  actionText: { color: color.fog200, fontSize: 14.5, fontFamily: type.sans },
  note: { color: color.fog500, fontSize: 12.5, lineHeight: 19, marginTop: space(6), fontFamily: type.sans },
})
