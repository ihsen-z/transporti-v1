import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Halo } from '@/shared/ui/Halo';
import { SurfaceToneProvider } from '@/shared/ui/SurfaceTone';
import { gradients, halos, spacing, SCREEN_PADDING } from '@/shared/theme';

// Écran de la famille IMMERSIVE : dégradé bleu plein écran, deux halos de
// lumière, surfaces de verre. La charte la réserve aux écrans qui n'ont pas
// encore de contenu applicatif à montrer — connexion, inscription, onboarding,
// OTP, mot de passe oublié.
//
// L'écran porte AUSSI le clavier et le défilement : les quatre écrans
// d'authentification répétaient le même trio
// SafeAreaView / KeyboardAvoidingView / ScrollView, avec des valeurs qui
// avaient commencé à diverger. Une seule copie, ici.
interface Props {
  children: ReactNode;
  /** `onboarding` = dégradé plus sombre (charte, §Fond immersif). */
  variant?: 'auth' | 'onboarding';
  testID?: string;
}

export function ImmersiveScreen({ children, variant = 'auth', testID }: Props) {
  const colors = variant === 'onboarding' ? gradients.onboarding : gradients.immersive;

  return (
    <SurfaceToneProvider tone="blue">
      <View testID={testID} style={styles.root}>
        {/* La charte écrit `linear-gradient(155deg, …)`. RN n'a pas d'angle :
            sur une boîte de téléphone (≈ 390 × 844), 155° tombe à un pour cent
            près sur la diagonale coin à coin — voir le calcul dans colors.ts. */}
        <LinearGradient
          colors={colors}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Deux halos MAXIMUM, jamais centrés, toujours partiellement hors
            cadre : c'est le débord qui les fait lire comme une source de
            lumière plutôt que comme une tache posée sur le fond.
            `start`/`end` et non `left`/`right` : en arabe TOUT l'écran se
            miroite, et deux halos restés sur leur bord physique donneraient
            une composition inversée par rapport au contenu. */}
        <Halo
          id="halo-green"
          color={halos.green.color}
          opacity={halos.green.opacity}
          size={halos.green.size}
          style={{ start: -70, top: 90 }}
        />
        <Halo
          id="halo-orange"
          color={halos.orange.color}
          opacity={halos.orange.opacity}
          size={halos.orange.size}
          style={{ end: -60, top: 330 }}
        />

        <StatusBar style="light" />

        <SafeAreaView style={styles.safe}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.safe}
          >
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </SurfaceToneProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  // Gap 24 : la charte espace plus large en immersif qu'en applicatif (16).
  content: {
    flexGrow: 1,
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: spacing.xl,
    gap: spacing.xl,
  },
});
