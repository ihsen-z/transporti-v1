import { type ReactNode } from 'react';
import { PanelScreen } from '@/shared/ui/PanelScreen';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  testID?: string;
}

// Panneau modal pour un FORMULAIRE : en-tête, évitement du clavier et
// défilement. Le contenu est fourni par l'appelant, qui peut le monter
// conditionnellement (`visible && <Form/>`) pour repartir d'un état frais à
// chaque ouverture.
//
// Il ne dessine plus son propre chrome : c'est `PanelScreen` qui le porte, et
// avec lui l'en-tête bleu, le fond figé et la feuille de la charte. Ce qui
// justifiait encore ce composant — l'évitement du clavier — vit désormais dans
// AppScreen, dont PanelScreen hérite. Il ne reste donc qu'un alias, gardé
// parce que sept panneaux l'importent et que son nom dit ce qu'il sert :
// « ceci contient un formulaire ».
export function FormModalPanel({ visible, title, onClose, children, testID }: Props) {
  return (
    <PanelScreen visible={visible} title={title} onClose={onClose} testID={testID}>
      {children}
    </PanelScreen>
  );
}
