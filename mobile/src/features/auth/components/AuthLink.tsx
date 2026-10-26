import { StyleSheet } from 'react-native';
import { Link, type Href } from 'expo-router';
import { Txt } from '@/shared/ui/Txt';
import { useOnBlue } from '@/shared/ui/SurfaceTone';
import { colors, fontSize } from '@/shared/theme';

// Lien de bas de page des écrans d'authentification.
//
// Deux défauts corrigés en une fois. `Link` rend un texte SANS rôle : l'arbre
// d'accessibilité ne signalait pas que ces sorties — dont la récupération de
// mot de passe — étaient actionnables. Et un `Link` stylé directement échappe
// à `Txt` : il retombait sur la police système au lieu d'Inter. Le `Txt`
// imbriqué règle les deux, sans perdre la navigation d'expo-router.
interface Props {
  href: Href;
  label: string;
  testID?: string;
}

export function AuthLink({ href, label, testID }: Props) {
  // Blanc sur le bleu des écrans immersifs, bleu de marque sur le clair de
  // l'inscription : le même lien sert les deux familles.
  const onBlue = useOnBlue();

  return (
    <Link href={href} testID={testID} accessibilityRole="link" accessibilityLabel={label}>
      <Txt style={[styles.link, { color: onBlue ? colors.onBlue[100] : colors.brand[600] }]}>
        {label}
      </Txt>
    </Link>
  );
}

const styles = StyleSheet.create({
  link: { fontSize: fontSize.md, fontWeight: '700' },
});
