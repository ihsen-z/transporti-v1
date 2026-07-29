import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { resolveFontFamily } from '@/shared/theme/typography';

// <Text> de la charte : applique Inter (FR) / Cairo (AR) avec la bonne graisse.
// RN ne relie pas fontWeight -> fichier de police custom : on résout la famille
// nous-mêmes depuis le fontWeight présent dans le style + la langue courante.
// Drop-in de <Text> (mêmes props) ; s'abonne à i18n pour suivre la langue.
export function Txt({ style, ...rest }: TextProps) {
  const { i18n } = useTranslation();
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const fontFamily = resolveFontFamily(flat?.fontWeight, i18n.language);
  return <Text {...rest} style={[style, { fontFamily }]} />;
}
