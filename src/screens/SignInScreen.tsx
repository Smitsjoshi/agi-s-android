import { useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { useAuth } from '@/state/auth'
import { color, line, radius, space, type } from '@/theme'

type Mode = 'in' | 'up' | 'reset'

/**
 * Sign in.
 *
 * ## Why a failure here is explained rather than labelled
 *
 * The web version showed "Sign-in is not set up yet — add your Firebase project
 * to server/.env" to every visitor, including the ones who could do nothing
 * about it. A person cannot edit a server config, and telling them to is the
 * product admitting it was never finished. Whatever goes wrong, this says what
 * happened and offers the one action worth taking.
 */
export function SignInScreen() {
  const { signIn, signUp, resetPassword, unavailable } = useAuth()
  const [mode, setMode] = useState<Mode>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const submit = async () => {
    if (busy) return
    setError(null)
    if (!email.trim()) return setError('Enter your email address.')
    if (mode !== 'reset' && password.length < 6) return setError('Passwords are at least six characters.')

    setBusy(true)
    try {
      if (mode === 'in') await signIn(email, password)
      else if (mode === 'up') await signUp(email, password)
      else {
        await resetPassword(email)
        setSent(true)
      }
    } catch (caught: unknown) {
      // Firebase codes are precise and unreadable. Translate the ones a person
      // actually hits; pass anything else through rather than inventing a
      // friendly message for a failure nobody anticipated.
      const code = String((caught as { code?: string })?.code ?? '')
      const map: Record<string, string> = {
        'auth/invalid-credential': 'That email and password do not match.',
        'auth/invalid-email': 'That does not look like an email address.',
        'auth/email-already-in-use': 'There is already an account with that email. Try signing in.',
        'auth/weak-password': 'Pick a longer password — at least six characters.',
        'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
        'auth/network-request-failed': 'No connection. Check your network and try again.',
        'auth/unauthorized-domain': 'This app is not yet authorised for sign-in. That is a setup step on our side.',
      }
      setError(map[code] ?? (caught as Error)?.message ?? 'Could not sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.brand}>AGI-S</Text>
        <Text style={styles.sub}>
          {mode === 'up' ? 'Create an account to get started.' : mode === 'reset' ? 'We will email you a reset link.' : 'Sign in to pick up where you left off.'}
        </Text>

        {unavailable && (
          <View style={styles.warn}>
            <Text style={styles.warnText}>{unavailable}</Text>
          </View>
        )}

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={color.fog500}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          style={styles.input}
        />

        {mode !== 'reset' && (
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={color.fog500}
            secureTextEntry
            autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
            style={styles.input}
            onSubmitEditing={submit}
          />
        )}

        {error && <Text style={styles.error}>{error}</Text>}
        {sent && <Text style={styles.ok}>Check your email for the link.</Text>}

        <Pressable onPress={submit} disabled={busy} style={({ pressed }) => [styles.primary, (busy || pressed) && { opacity: 0.8 }]}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>
              {mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create account' : 'Send reset link'}
            </Text>
          )}
        </Pressable>

        <View style={styles.links}>
          {mode !== 'in' && <Link label="Sign in" onPress={() => { setMode('in'); setError(null) }} />}
          {mode !== 'up' && <Link label="Create an account" onPress={() => { setMode('up'); setError(null) }} />}
          {mode !== 'reset' && <Link label="Forgot password" onPress={() => { setMode('reset'); setError(null) }} />}
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const Link = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable onPress={onPress} hitSlop={8}>
    <Text style={styles.link}>{label}</Text>
  </Pressable>
)

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.ink950, justifyContent: 'center' },
  inner: { paddingHorizontal: space(7) },
  brand: { color: color.fog50, fontSize: 30, fontWeight: '700', textAlign: 'center', fontFamily: type.sans },
  sub: { color: color.fog400, fontSize: 14.5, textAlign: 'center', marginTop: space(2), marginBottom: space(7), fontFamily: type.sans },
  input: {
    backgroundColor: color.ink850,
    borderWidth: 1,
    borderColor: line.soft,
    borderRadius: radius.md,
    paddingHorizontal: space(4),
    paddingVertical: space(3.5),
    color: color.fog50,
    fontSize: 15.5,
    marginBottom: space(3),
    fontFamily: type.sans,
  },
  primary: {
    backgroundColor: color.iris500,
    borderRadius: radius.md,
    paddingVertical: space(4),
    alignItems: 'center',
    marginTop: space(2),
  },
  primaryText: { color: '#fff', fontSize: 15.5, fontWeight: '600', fontFamily: type.sans },
  links: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: space(5), marginTop: space(6) },
  link: { color: color.iris300, fontSize: 13.5, fontFamily: type.sans },
  error: { color: color.breached300, fontSize: 13, marginBottom: space(2), fontFamily: type.sans },
  ok: { color: color.held300, fontSize: 13, marginBottom: space(2), fontFamily: type.sans },
  warn: {
    borderWidth: 1,
    borderColor: 'rgba(200,135,31,0.3)',
    backgroundColor: 'rgba(200,135,31,0.08)',
    borderRadius: radius.md,
    padding: space(3),
    marginBottom: space(4),
  },
  warnText: { color: color.degraded300, fontSize: 13, lineHeight: 19, fontFamily: type.sans },
})
