import { memo, useMemo } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'
import Markdown from 'react-native-markdown-display'

import { color, line, radius, space, type } from '@/theme'

/**
 * An answer, rendered.
 *
 * ## Why the markdown is only parsed when the text stops changing
 *
 * Markdown parsing is not free, and an answer that is still arriving changes
 * sixty times a second. Re-parsing a growing document on every frame is the
 * second way a chat app stutters — the first being an unbatched setState, which
 * `useChat` already handles.
 *
 * Worse than slow, it is *wrong* mid-stream. A half-written fence (```) parses
 * as an unterminated code block, so the rest of the answer flickers between
 * code and prose as it arrives, and a half-written table renders as pipes. So
 * while text is still coming it is drawn as plain text — which is what it is —
 * and parsed once at the end, when it is finally valid markdown.
 *
 * ## Why `memo`
 *
 * Every token re-renders the list. Without this, every *previous* answer
 * re-parses its markdown too, so a long conversation gets slower with each
 * message — the shape of problem that looks like "the app degrades over time"
 * and is impossible to attribute later.
 */

type Props = {
  text: string
  streaming?: boolean
  sources?: { title: string; url: string }[]
}

export const Answer = memo(function Answer({ text, streaming, sources }: Props) {
  const body = useMemo(() => {
    if (streaming) {
      return (
        <Text style={styles.plain}>
          {text}
          {/* A caret, so an answer that has paused still looks alive. */}
          <Text style={styles.caret}>▋</Text>
        </Text>
      )
    }
    return <Markdown style={markdownStyles}>{text}</Markdown>
  }, [text, streaming])

  return (
    <View>
      {body}
      {!streaming && sources && sources.length > 0 && <Sources sources={sources} />}
    </View>
  )
})

/**
 * Where the answer came from.
 *
 * Shown only once the answer is finished — a citation list that grows while you
 * are reading pulls the eye away from the sentence you are on.
 */
function Sources({ sources }: { sources: NonNullable<Props['sources']> }) {
  return (
    <View style={styles.sources}>
      <Text style={styles.sourcesLabel}>Sources</Text>
      {sources.slice(0, 6).map((source, index) => (
        <Text
          key={`${source.url}-${index}`}
          style={styles.source}
          numberOfLines={1}
          onPress={() => void Linking.openURL(source.url)}
        >
          {index + 1}. {source.title || source.url}
        </Text>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  plain: { color: color.fog200, fontSize: 15.5, lineHeight: 24, fontFamily: type.sans },
  caret: { color: color.iris400 },

  sources: {
    marginTop: space(3),
    paddingTop: space(3),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: line.faint,
  },
  sourcesLabel: {
    color: color.fog500,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: space(1.5),
    fontFamily: type.sans,
  },
  source: { color: color.iris300, fontSize: 13, lineHeight: 21, fontFamily: type.sans },
})

/**
 * Markdown styling, matching the web app's answer typography.
 *
 * Line height 24 on a 15.5pt body is the ratio that stops long answers reading
 * as a wall — the single most important number here, and the one most often
 * left at the library default.
 */
const markdownStyles = {
  body: { color: color.fog200, fontSize: 15.5, lineHeight: 24, fontFamily: type.sans },
  heading1: { color: color.fog50, fontSize: 21, lineHeight: 29, fontWeight: '600', marginTop: space(4), marginBottom: space(2) },
  heading2: { color: color.fog50, fontSize: 18, lineHeight: 26, fontWeight: '600', marginTop: space(4), marginBottom: space(2) },
  heading3: { color: color.fog50, fontSize: 16, lineHeight: 24, fontWeight: '600', marginTop: space(3), marginBottom: space(1.5) },
  paragraph: { marginTop: 0, marginBottom: space(3) },
  strong: { color: color.fog50, fontWeight: '600' },
  em: { fontStyle: 'italic' },
  link: { color: color.iris300 },
  bullet_list: { marginBottom: space(3) },
  ordered_list: { marginBottom: space(3) },
  list_item: { marginBottom: space(1.5) },

  code_inline: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    color: color.aqua400,
    fontFamily: type.mono,
    fontSize: 13.5,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  fence: {
    backgroundColor: color.ink900,
    borderWidth: 1,
    borderColor: line.faint,
    borderRadius: radius.md,
    padding: space(3),
    color: color.fog200,
    fontFamily: type.mono,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: space(3),
  },
  code_block: {
    backgroundColor: color.ink900,
    borderRadius: radius.md,
    padding: space(3),
    color: color.fog200,
    fontFamily: type.mono,
    fontSize: 13,
    lineHeight: 20,
  },

  blockquote: {
    backgroundColor: 'transparent',
    borderLeftWidth: 2,
    borderLeftColor: color.iris500,
    paddingLeft: space(3),
    marginLeft: 0,
    marginBottom: space(3),
  },

  table: { borderWidth: 1, borderColor: line.faint, borderRadius: radius.md, marginBottom: space(3) },
  thead: { backgroundColor: 'rgba(255,255,255,0.04)' },
  th: { padding: space(2), color: color.fog50, fontWeight: '600' },
  td: { padding: space(2), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: line.faint },

  hr: { backgroundColor: line.faint, height: StyleSheet.hairlineWidth, marginVertical: space(4) },
} as const
