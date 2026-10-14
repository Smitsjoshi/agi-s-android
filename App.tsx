import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'

import { ChatScreen } from '@/screens/ChatScreen'
import { PlansScreen } from '@/screens/PlansScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'
import { SignInScreen } from '@/screens/SignInScreen'
import { AuthProvider, useAuth } from '@/state/auth'
import { PlanProvider } from '@/state/plan'
import { color, line, space, type } from '@/theme'

/**
 * The app.
 *
 * ## Why three tabs and not a drawer
 *
 * A drawer hides everything behind a gesture people have to learn, and on a
 * phone the whole product is three places: the conversation, what you are
 * allowed to do, and your account. Tabs make all three one tap away and cost
 * nothing to discover.
 *
 * ## Why this is hand-rolled rather than React Navigation
 *
 * Three screens with no history, no deep links and no params. A navigator
 * brings a dependency, a gesture handler and a native stack to model state a
 * single variable already models. When there are nested screens or links into
 * a conversation, that calculation changes and the navigator earns its place.
 */

type Tab = 'chat' | 'plans' | 'settings'

function Shell() {
  const { user, loading } = useAuth()
  const [tab, setTab] = useState<Tab>('chat')
  const insets = useSafeAreaInsets()

  /**
   * Nothing is drawn until it is known whether there is a session.
   *
   * Rendering sign-in first and then replacing it means a returning user sees
   * a sign-in form flash on every cold start, which reads as having been
   * logged out.
   */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={color.iris400} />
      </View>
    )
  }

  if (!user) return <SignInScreen />

  return (
    <PlanProvider>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={{ flex: 1 }}>
          {tab === 'chat' && <ChatScreen />}
          {tab === 'plans' && <PlansScreen />}
          {tab === 'settings' && <SettingsScreen onOpenPlans={() => setTab('plans')} />}
        </View>

        <View style={[styles.tabs, { paddingBottom: Math.max(insets.bottom, space(2)) }]}>
          <TabButton label="Chat" active={tab === 'chat'} onPress={() => setTab('chat')} />
          <TabButton label="Plans" active={tab === 'plans'} onPress={() => setTab('plans')} />
          <TabButton label="Account" active={tab === 'settings'} onPress={() => setTab('settings')} />
        </View>
      </View>
    </PlanProvider>
  )
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.tab}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
      {/* A bar rather than a colour change alone: colour is the first thing
          lost to a bright screen outdoors or to colour blindness. */}
      <View style={[styles.indicator, active && styles.indicatorActive]} />
    </Pressable>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.ink950 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.ink950 },
  tabs: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: line.faint,
    paddingTop: space(2),
    backgroundColor: color.ink950,
  },
  tab: { flex: 1, alignItems: 'center', gap: space(1.5), paddingVertical: space(1) },
  tabText: { color: color.fog500, fontSize: 12.5, fontFamily: type.sans },
  tabTextActive: { color: color.fog50, fontWeight: '600' },
  indicator: { width: 18, height: 2, borderRadius: 1, backgroundColor: 'transparent' },
  indicatorActive: { backgroundColor: color.iris400 },
})
