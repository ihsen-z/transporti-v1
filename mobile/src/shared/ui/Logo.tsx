import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/shared/theme';

// Logo officiel : barre/triangle bleu + flèche verte (design-system).
// Les chemins forment le « T » de Transporti (viewBox 512).
const BLUE = '#2563B3';
const GREEN = '#2FAC55';

interface Props {
  size?: number;
  // Affiche « [mark]ransporti » (le mark remplace le T).
  wordmark?: boolean;
}

export function Logo({ size = 32, wordmark = false }: Props) {
  const mark = (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Path d="M108 120 L310 120 L280 210 L78 210 Z" fill={BLUE} />
      <Path
        d="M130 460 C100 350, 82 280, 100 230 C118 185, 160 168, 230 168 L230 95 L420 195 L230 295 L230 225 C180 225, 155 240, 145 268 C132 300, 135 360, 155 460 Z"
        fill={GREEN}
      />
    </Svg>
  );

  if (!wordmark) return mark;

  return (
    <View style={styles.row}>
      {mark}
      <Text style={[styles.word, { fontSize: size * 0.62, marginLeft: -size * 0.06 }]}>
        ransporti
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  word: { fontWeight: '800', color: colors.neutral[900], letterSpacing: -0.5 },
});
