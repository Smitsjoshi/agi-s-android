import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useChat, type Message } from '@/hooks/useChat'
import { Answer } from '@/components/Answer'
import { Picker } from '@/components/Picker'
import { DEFAULT_DEPTH, DEPTHS, findDepth, type DepthId } from '@/config/depths'
import { DEFAULT_PERSONA, PERSONAS, findPersona } from '@/config/personas'
import { usePlan } from '@/state/plan'
import { color, line, radius, space, type } from '@/theme'

/**
 * The conversation.
 *
 * ## Why a FlatList and not a ScrollView
 *
 * A long conversation holds a lot of laid-out text, and a ScrollView keeps every
 * message mounted. On a mid-range Android that is where scrolling starts to
 * drop frames — not during streaming, but twenty messages later, which makes it
 * look like the app degrades the more you use it.
 *
 * ## Why it is inverted
 *
 * An inverted list renders from the bottom, so new content appears exactly where
 * the eye already is and there is no scroll-to-end to chase. The alternative —
 * a normal list plus `scrollToEnd` on every token — fights the user the moment
 * they scroll up to re-read something, which is precisely when they are most
 * annoyed by it.
 */
export function ChatScreen() {
  const { messages, streaming, stage, followups, send, stop } = useChat()
  const { locked } = usePlan()
  const [draft, setDraft] = useState('')
  const [depth, setDepth] = useState<DepthId>(DEFAULT_DEPTH)
  const [persona, setPersona] = useState(DEFAULT_PERSONA)
  const [picking, setPicking] = useState<'depth' | 'persona' | null>(null)

  /**
   * Deep and Maximum need a paid plan.
   *
   * The server is the enforcement -- it lowers the depth and sends a `depth`
   * event saying it did. Marking them here means somebody on the free plan sees
   * that the setting exists and why it is unavailable, rather than choosing it
   * and quietly receiving a Balanced answer.
   */
  const deepLocked = locked('deep-depth')
  const insets = useSafeAreaInsets()
  const inputRef = useRef<TextInput>(null)

  /** Newest first, because the list is inverted. */
  const ordered = [...messages].reverse()

  const submit = useCallback(() => {
    const text = draft.trim()
    if (!text || streaming) return
    setDraft('')
    // A short tap at the moment of sending. The one piece of haptic feedback in
    // the app: used everywhere it becomes noise and people turn it off.
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    void send(text, { depthId: depth, personaId: persona })
  }, [draft, streaming, send, depth, persona])

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      {messages.length === 0 ? (
        <Empty />
      ) : (
        <FlatList
          data={ordered}
          inverted
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <Bubble message={item} />}
          contentContainerStyle={{ paddingHorizontal: space(4), paddingVertical: space(4) }}
          keyboardDismissMode="interactive"
          // The text is already laid out; re-clipping it every frame costs more
          // than it saves on a list this size.
          removeClippedSubviews={false}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* What the answer will be shaped by, always visible and one tap away. */}
      <View style={styles.controls}>
        <Control label={findDepth(depth).name} onPress={() => setPicking('depth')} />
        <Control label={findPersona(persona).name} onPress={() => setPicking('persona')} />
      </View>

      {stage && <Stage label={stage} />}

      {followups.length > 0 && !streaming && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.followups}
        >
          {followups.map((question) => (
            <Pressable
              key={question}
              onPress={() => void send(question)}
              style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            >
              <Text style={styles.chipText} numberOfLines={1}>
                {question}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Picker
        open={picking === 'depth'}
        title="How hard should it think?"
        options={DEPTHS.map((d) => ({ id: d.id, name: d.name, blurb: d.blurb, locked: d.gated && deepLocked }))}
        selected={depth}
        onSelect={(id) => setDepth(id as DepthId)}
        onClose={() => setPicking(null)}
        lockedNote={deepLocked ? 'Deep and Maximum are part of a paid plan. Redeem a code in Plans if you have one.' : undefined}
      />

      <Picker
        open={picking === 'persona'}
        title="How should it answer?"
        options={PERSONAS.map((p) => ({ id: p.id, name: p.name, blurb: p.blurb }))}
        selected={persona}
        onSelect={setPersona}
        onClose={() => setPicking(null)}
      />

      <Composer
        ref={inputRef}
        value={draft}
        onChange={setDraft}
        onSubmit={submit}
        onStop={stop}
        streaming={streaming}
        bottomInset={insets.bottom}
      />
    </KeyboardAvoidingView>
  )
}

/* ── Pieces ──────────────────────────────────────────────────────────────── */

function Bubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.text}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.answerRow}>
      {message.error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{message.error}</Text>
        </View>
      ) : (
        <Answer text={message.text} streaming={message.streaming} sources={message.sources} />
      )}
    </View>
  )
}

/**
 * What the model is doing, while there is nothing to show yet.
 *
 * A spinner says "wait". "Searching the web" says why, and a wait you
 * understand is a shorter wait than the same number of seconds spent guessing.
 */
function Stage({ label }: { label: string }) {
  return (
    <View style={styles.stage}>
      <ActivityIndicator size="small" color={color.iris400} />
      <Text style={styles.stageText}>{label}…</Text>
    </View>
  )
}

function Control({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} style={({ pressed }) => [styles.control, pressed && styles.chipPressed]}>
      <Text style={styles.controlText}>{label}</Text>
      <Text style={styles.controlCaret}>⌄</Text>
    </Pressable>
  )
}

function Empty() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>AGI-S</Text>
      <Text style={styles.emptyBody}>Ask anything. Depth is chosen for you unless you change it.</Text>
    </View>
  )
}

type ComposerProps = {
  value: string
  onChange: (next: string) => void
  onSubmit: () => void
  onStop: () => void
  streaming: boolean
  bottomInset: number
}

const Composer = ({ value, onChange, onSubmit, onStop, streaming, bottomInset }: ComposerProps) => {
  /**
   * Grows with the text, up to a ceiling.
   *
   * A single-line input makes anyone writing a real question feel they are
   * writing in a slot. An unbounded one eventually eats the conversation. Six
   * lines is roughly where a question stops being a question.
   */
  const [height, setHeight] = useState(0)
  const lineHeight = 22
  const maxHeight = lineHeight * 6

  return (
    <View style={[styles.composerWrap, { paddingBottom: Math.max(bottomInset, space(3)) }]}>
      <View style={styles.composer}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="Ask AGI-S"
          placeholderTextColor={color.fog500}
          multiline
          style={[styles.input, { height: Math.min(Math.max(lineHeight, height), maxHeight) }]}
          onContentSizeChange={(event) => setHeight(event.nativeEvent.contentSize.height)}
          // Enter sends; Shift+Enter is a newline on a hardware keyboard. On a
          // touch keyboard `blurOnSubmit={false}` keeps the keyboard up, which
          // is what you want when asking several questions in a row.
          blurOnSubmit={false}
          returnKeyType="send"
          onSubmitEditing={onSubmit}
        />

        <Pressable
          onPress={streaming ? onStop : onSubmit}
          disabled={!streaming && !value.trim()}
          style={({ pressed }) => [
            styles.sendButton,
            streaming && styles.stopButton,
            !streaming && !value.trim() && styles.sendDisabled,
            pressed && { opacity: 0.8 },
          ]}
          // 44pt is the smallest reliably tappable target; smaller is the most
          // common reason a button "doesn't work" on a phone.
          hitSlop={8}
          accessibilityLabel={streaming ? 'Stop generating' : 'Send'}
        >
          <Text style={styles.sendIcon}>{streaming ? '■' : '↑'}</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.ink950 },

  userRow: { alignItems: 'flex-end', marginBottom: space(4) },
  userBubble: {
    maxWidth: '86%',
    backgroundColor: color.iris500,
    paddingHorizontal: space(3.5),
    paddingVertical: space(2.5),
    borderRadius: radius.xl,
    borderBottomRightRadius: radius.sm,
  },
  userText: { color: '#fff', fontSize: 15.5, lineHeight: 22, fontFamily: type.sans },

  answerRow: { marginBottom: space(6) },

  errorBox: {
    borderWidth: 1,
    borderColor: 'rgba(224,69,90,0.3)',
    backgroundColor: 'rgba(224,69,90,0.08)',
    borderRadius: radius.md,
    padding: space(3),
  },
  errorText: { color: color.breached300, fontSize: 13.5, lineHeight: 20, fontFamily: type.sans },

  stage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    paddingHorizontal: space(5),
    paddingBottom: space(2),
  },
  stageText: { color: color.fog400, fontSize: 13, fontFamily: type.sans },

  followups: { paddingHorizontal: space(4), paddingBottom: space(2), gap: space(2) },
  chip: {
    borderWidth: 1,
    borderColor: line.soft,
    borderRadius: radius.pill,
    paddingHorizontal: space(3.5),
    paddingVertical: space(2),
    maxWidth: 260,
  },
  chipPressed: { backgroundColor: 'rgba(255,255,255,0.05)' },
  chipText: { color: color.fog300, fontSize: 13, fontFamily: type.sans },

  composerWrap: {
    paddingHorizontal: space(3),
    paddingTop: space(2),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: line.faint,
    backgroundColor: color.ink950,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space(2),
    backgroundColor: color.ink850,
    borderWidth: 1,
    borderColor: line.soft,
    borderRadius: radius.xl,
    paddingLeft: space(4),
    paddingRight: space(2),
    paddingVertical: space(2),
  },
  input: {
    flex: 1,
    color: color.fog50,
    fontSize: 15.5,
    lineHeight: 22,
    fontFamily: type.sans,
    paddingTop: Platform.OS === 'ios' ? space(1) : 0,
    paddingBottom: Platform.OS === 'ios' ? space(1) : 0,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.iris500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: { backgroundColor: color.ink600 },
  sendDisabled: { backgroundColor: color.ink700 },
  sendIcon: { color: '#fff', fontSize: 15, fontWeight: '600' },

  controls: { flexDirection: 'row', gap: space(2), paddingHorizontal: space(4), paddingBottom: space(2) },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
    borderWidth: 1,
    borderColor: line.soft,
    borderRadius: radius.pill,
    paddingHorizontal: space(3),
    paddingVertical: space(1.5),
  },
  controlText: { color: color.fog300, fontSize: 12.5, fontFamily: type.sans },
  controlCaret: { color: color.fog500, fontSize: 11 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space(10) },
  emptyTitle: { color: color.fog50, fontSize: 24, fontWeight: '600', fontFamily: type.sans },
  emptyBody: {
    color: color.fog500,
    fontSize: 14.5,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: space(2),
    fontFamily: type.sans,
  },
})
