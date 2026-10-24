import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Txt } from '@/shared/ui/Txt';
import { SurfaceToneProvider } from '@/shared/ui/SurfaceTone';
import {
  colors,
  spacing,
  fontSize,
  tracking,
  SCREEN_PADDING,
} from '@/shared/theme';

// En-tête de la famille APPLICATIVE : titre et contenu libre, posés sur le
// fond bleu FIXE que peint `AppScreen`.
//
// Il ne dessine ni dégradé ni halo : c'est le bandeau d'AppScreen qui les
// porte, hors du flux. Il était auparavant ce bloc bleu lui-même, dans le flux
// du défilement — il partait donc avec le contenu, et le « fond » de l'écran
// disparaissait au premier geste. Ce composant ne porte plus que ce qui doit
// s'estomper en défilant, d'où sa transparence.
//
// Il reste du BLEU : tout ce qu'on y pose (champ, bouton fantôme, bandeau
// info) doit passer en verre. D'où le SurfaceToneProvider — sans lui, un
// composant partagé rendu dans l'en-tête se dessinerait en version « fond
// clair » et disparaîtrait.
//
// L'inset du haut est porté par un `SafeAreaView`, et pas par un
// `paddingTop: useSafeAreaInsets().top` : le hook renvoie 0 sur cet Android
// alors que le composant natif lit les vraies WindowInsets — mesuré le 06/09
// sur Pixel 7 API 35, où la marque et la bascule de langue se dessinaient
// par-dessus l'horloge.
interface Props {
  title?: string;
  /** Ligne du haut : retour, avatar, actions. */
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Contenu libre sous le titre (recherche, KPI…). */
  children?: ReactNode;
  testID?: string;
}

export function AppHeader({ title, leading, trailing, children, testID }: Props) {
  return (
    <SurfaceToneProvider tone="blue">
      <View testID={testID}>
        <SafeAreaView edges={['top']} style={styles.content}>
          {leading || trailing ? (
            <View style={styles.row}>
              <View style={styles.side}>{leading}</View>
              <View style={styles.side}>{trailing}</View>
            </View>
          ) : null}
          {title ? <Txt style={styles.title}>{title}</Txt> : null}
          {children}
        </SafeAreaView>
      </View>
    </SurfaceToneProvider>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.md,
    // La feuille de contenu vient recouvrir le bas de l'en-tête en glissant :
    // ce padding est la marge qu'elle ne mange pas.
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: {
    fontSize: fontSize.title,
    fontWeight: '800',
    color: colors.onBlue[100],
    letterSpacing: tracking.title,
  },
});
