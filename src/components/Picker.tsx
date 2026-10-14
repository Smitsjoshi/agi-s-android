import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Sheet } from '@/components/Sheet'
import { color, line, radius, space, type } from '@/theme'

export type Option = { id: string; name: string; blurb: string; locked?: boolean }

/**
 * Choose one thing from a list, in a sheet.
 *
 * A locked option is shown, not hidden. Hiding it means somebody on the free
 * plan never learns Deep exists; showing it greyed with the reason is how they
 * find out there is something worth paying for. The server enforces it either
 * way — this is presentation, not the lock.
 */
export function Picker({
  open,
  title,
  options,
  selected,
  onSelect,
  onClose,
  lockedNote,
}: {
  open: boolean
  title: string
  options: readonly Option[]
  selected: string
  onSelect: (id: string) => void
  onClose: () => void
  lockedNote?: string
}) {
  return (
    <Sheet open={open} title={title} onClose={onClose}>
      {options.map((option) => {
        const active = option.id === selected
        return (
          <Pressable
            key={option.id}
            onPress={() => {
              if (option.locked) return
              onSelect(option.id)
              onClose()
            }}
            style={({ pressed }) => [
              styles.row,
              active && styles.rowActive,
              pressed && !option.locked && { backgroundColor: 'rgba(255,255,255,0.04)' },
            ]}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={[styles.name, option.locked && styles.muted]}>{option.name}</Text>
                {option.locked && <Text style={styles.lock}>Paid plan</Text>}
                {active && <Text style={styles.tick}>✓</Text>}
              </View>
              <Text style={[styles.blurb, option.locked && styles.muted]}>{option.blurb}</Text>
            </View>
          </Pressable>
        )
      })}
      {lockedNote && <Text style={styles.note}>{lockedNote}</Text>}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  row: { borderWidth: 1, borderColor: 'transparent', borderRadius: radius.md, padding: space(3), marginBottom: space(1.5) },
  rowActive: { borderColor: color.iris500, backgroundColor: 'rgba(124,92,255,0.08)' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  name: { color: color.fog50, fontSize: 14.5, fontWeight: '600', fontFamily: type.sans },
  blurb: { color: color.fog400, fontSize: 12.5, lineHeight: 19, marginTop: space(0.5), fontFamily: type.sans },
  muted: { opacity: 0.45 },
  lock: { color: color.gold300, fontSize: 10.5, letterSpacing: 0.4, fontFamily: type.sans },
  tick: { color: color.iris300, fontSize: 13, marginLeft: 'auto', fontFamily: type.sans },
  note: { color: color.fog500, fontSize: 12, lineHeight: 18, marginTop: space(2), marginBottom: space(2), fontFamily: type.sans },
})
