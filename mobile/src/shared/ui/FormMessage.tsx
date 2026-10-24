import { StyleSheet } from 'react-native';
import { Txt } from '@/shared/ui/Txt';
import { useOnBlue } from '@/shared/ui/SurfaceTone';
import { colors, fontSize } from '@/shared/theme';

// Message de retour d'un formulaire : erreur serveur, confirmation d'envoi.
//
// Il existe parce que les quatre formulaires d'authentification portaient
// chacun leur propre style de message, tous codés pour un fond blanc. Depuis
// que ces écrans sont immersifs, un rouge #dc2626 sur le dégradé bleu tombe à
// ~1,5:1 — invisible, et c'est précisément le texte qui dit pourquoi la
// connexion a échoué.
type Intent = 'error' | 'success';

interface Props {
  children: string;
  intent?: Intent;
  testID?: string;
}

export function FormMessage({ children, intent = 'error', testID }: Props) {
  const onBlue = useOnBlue();
  const color =
    intent === 'error'
      ? onBlue
        ? colors.text.errorOnBlue
        : colors.text.error
      : onBlue
        ? colors.text.greenOnBlue
        : colors.text.green;

  return (
    <Txt testID={testID} style={[styles.text, { color }]}>
      {children}
    </Txt>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: fontSize.sm, fontWeight: '600', lineHeight: 20 },
});
