import { Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Txt } from '@/shared/ui/Txt';
import { colors, gradients } from '@/shared/theme';

// Avatar : photo si `imageUrl` est fourni, sinon dégradé bleu avec initiale
// (design-system). Rétrocompatible — les appels existants ne passent que `name`.
interface Props {
  name?: string | null;
  size?: number;
  imageUrl?: string | null;
  testID?: string;
}

export function Avatar({ name, size = 44, imageUrl, testID }: Props) {
  const dimStyle = { width: size, height: size, borderRadius: size * 0.32 };

  if (imageUrl) {
    return (
      <Image
        testID={testID}
        source={{ uri: imageUrl }}
        style={[styles.av, styles.photo, dimStyle]}
      />
    );
  }

  const initial = (name?.trim()?.charAt(0) ?? '?').toUpperCase();
  return (
    <LinearGradient
      testID={testID}
      colors={gradients.brand}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.av, dimStyle]}
    >
      <Txt style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Txt>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  av: { alignItems: 'center', justifyContent: 'center' },
  photo: { backgroundColor: colors.brand[100] },
  initial: { color: colors.neutral[0], fontWeight: '800' },
});
