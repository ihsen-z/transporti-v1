import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Txt } from '@/shared/ui/Txt';
import { colors, spacing, fontSize, radii, shadows } from '@/shared/theme';
import { useToastStore } from './toastStore';

// Affiche le toast courant (bandeau en haut) avec fondu + auto-masquage.
// Monté une fois au niveau racine (au-dessus de la navigation).
export function ToastHost() {
  const message = useToastStore((s) => s.message);
  const hide = useToastStore((s) => s.hide);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(
        () => hide(),
      );
    }, 2600);
    return () => clearTimeout(timer);
  }, [message, opacity, hide]);

  if (!message) return null;

  return (
    // zIndex + elevation : indispensables sur Android pour passer AU-DESSUS du
    // navigateur (qui a sa propre elevation), sinon le toast rend derrière.
    <View style={styles.wrap} pointerEvents="none">
      <SafeAreaView edges={['top']}>
        <Animated.View style={[styles.toast, { opacity }]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.green[600]} />
          <Txt style={styles.text} numberOfLines={2}>
            {message}
          </Txt>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
    elevation: 24,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.neutral[0],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.card,
  },
  text: { flexShrink: 1, fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[900] },
});
