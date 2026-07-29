import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Txt } from '@/shared/ui/Txt';
import { colors, gradients } from '@/shared/theme';

// Avatar dégradé bleu avec initiale (design-system).
interface Props {
  name?: string | null;
  size?: number;
}

export function Avatar({ name, size = 44 }: Props) {
  const initial = (name?.trim()?.charAt(0) ?? '?').toUpperCase();
  return (
    <LinearGradient
      colors={gradients.brand}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.av, { width: size, height: size, borderRadius: size * 0.32 }]}
    >
      <Txt style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Txt>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  av: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.neutral[0], fontWeight: '800' },
});
