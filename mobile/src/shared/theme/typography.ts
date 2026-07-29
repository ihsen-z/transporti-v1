import type { TextStyle } from 'react-native';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
} from '@expo-google-fonts/cairo';

// Map { nom de famille -> module de police } à passer à useFonts au démarrage.
// En React Native, chaque graisse est enregistrée comme une famille distincte
// (fontWeight ne sélectionne PAS le fichier de police custom tout seul).
export const fontsToLoad = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
};

type Weight = '400' | '500' | '600' | '700' | '800';

// Charte : Inter (latin) pour le français, Cairo (arabe + latin) pour l'arabe
// — Inter ne possède pas de glyphes arabes.
const INTER: Record<Weight, string> = {
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
  '800': 'Inter_800ExtraBold',
};
const CAIRO: Record<Weight, string> = {
  '400': 'Cairo_400Regular',
  '500': 'Cairo_500Medium',
  '600': 'Cairo_600SemiBold',
  '700': 'Cairo_700Bold',
  '800': 'Cairo_800ExtraBold',
};

// Ramène un fontWeight RN (number | string | 'bold' | undefined) sur notre
// échelle de graisses disponibles.
function normalizeWeight(w: TextStyle['fontWeight']): Weight {
  const s = String(w ?? '400');
  if (s === 'bold') return '700';
  if (s === '900') return '800';
  if (s === '400' || s === '500' || s === '600' || s === '700' || s === '800') {
    return s;
  }
  return '400'; // 100/200/300/'normal' -> regular
}

// Famille de police finale pour une graisse + une langue donnée.
export function resolveFontFamily(weight: TextStyle['fontWeight'], lang: string): string {
  const table = lang.startsWith('ar') ? CAIRO : INTER;
  return table[normalizeWeight(weight)];
}
