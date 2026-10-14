import type { ReactNode } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { color, line, radius, space, type } from '@/theme'

/**
 * A bottom sheet.
 *
 * Choices on a phone belong at the bottom, where the thumb is. A centred modal
 * on a 6-inch screen puts every option out of reach of the hand holding it, and
 * the dismiss control furthest away of all.
 *
 * Tapping the backdrop closes it, because on a phone that is the gesture people
 * try first — and a sheet that ignores it feels stuck.
 */
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space(4)) }]}>
        <View style={styles.grabber} />
        <Text style={styles.title}>{title}</Text>
        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: color.ink850,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: line.soft,
    paddingHorizontal: space(4),
    paddingTop: space(2),
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: space(3),
  },
  title: { color: color.fog50, fontSize: 16, fontWeight: '600', marginBottom: space(3), fontFamily: type.sans },
})
