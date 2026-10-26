import { Modal } from 'react-native';
import type { ReactElement, ReactNode } from 'react';
import { AppScreen } from '@/shared/ui/AppScreen';
import { AppHeader } from '@/shared/ui/AppHeader';
import { CloseButton } from '@/shared/ui/CloseButton';

// Panneau plein écran : avis, litiges, favoris, portefeuille, confiance, zones
// de service, carnet d'adresses, réglages, « à propos »…
//
// Ce sont des VUES, atteintes depuis le Profil, et elles étaient restées en
// dehors de la charte : huit copies du même chrome écrit à la main — un
// `Modal`, un `SafeAreaView` gris, un titre à gauche et une croix à droite.
// Pas d'en-tête bleu, pas de feuille, pas de fond figé. On y perdait la charte
// dès qu'on ouvrait un réglage.
//
// Un panneau est un écran applicatif comme un autre : il délègue donc à
// AppScreen, et hérite du même coup le fond bleu fixe, la feuille aux coins
// arrondis et la parallaxe de l'en-tête.
interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Contenu libre sous le titre, DANS le bleu (sous-titre, filtres…). */
  headerChildren?: ReactNode;
  /** Barre d'action fixe en bas (ActionBar), hors défilement. */
  footer?: ReactNode;
  /** `false` quand le contenu défile lui-même (FlatList). */
  scroll?: boolean;
  refreshControl?: ReactElement;
  /** Marge basse du contenu (`scroll` seulement). */
  contentPaddingBottom?: number;
  testID?: string;
}

export function PanelScreen({
  visible,
  title,
  onClose,
  children,
  headerChildren,
  footer,
  scroll = true,
  refreshControl,
  contentPaddingBottom,
  testID,
}: Props) {
  return (
    <Modal
      testID={testID}
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      // Le panneau doit couvrir la barre d'état : sans ça son fond bleu
      // s'arrête sous l'horloge, et on voit une bande de l'écran d'en dessous.
      statusBarTranslucent
    >
      <AppScreen
        scroll={scroll}
        refreshControl={refreshControl}
        contentPaddingBottom={contentPaddingBottom}
        footer={footer}
        header={
          <AppHeader
            title={title}
            trailing={
              <CloseButton
                onPress={onClose}
                testID={testID ? `${testID}-close` : undefined}
              />
            }
          >
            {headerChildren}
          </AppHeader>
        }
      >
        {children}
      </AppScreen>
    </Modal>
  );
}
