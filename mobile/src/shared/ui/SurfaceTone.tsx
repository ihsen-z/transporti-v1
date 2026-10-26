import { createContext, useContext, type ReactNode } from 'react';

// Sur quel fond le sous-arbre est-il posé ?
//
//   'light' — fond applicatif `neutral[50]`, cartes blanches opaques
//   'blue'  — dégradé immersif, surfaces de verre
//
// La charte dit « le verre ne vit que sur le bleu » ; c'est une règle qui
// s'applique à des COMPOSANTS PARTAGÉS (champ, bouton, bandeau info) rendus
// indifféremment dans les deux familles d'écrans. Trois options existaient :
// dupliquer chaque composant en version verre, ajouter une prop `tone` à
// chacun et la faire descendre à travers les formulaires, ou déclarer le ton
// UNE fois au niveau de l'écran.
//
// C'est la troisième qui est retenue : `LoginForm` n'a pas à savoir sur quel
// fond il est rendu, et un composant partagé ne peut pas se tromper de
// famille — il lit le ton de l'écran qui le contient.
export type Tone = 'light' | 'blue';

const SurfaceToneContext = createContext<Tone>('light');

export function SurfaceToneProvider({
  tone,
  children,
}: {
  tone: Tone;
  children: ReactNode;
}) {
  return (
    <SurfaceToneContext.Provider value={tone}>{children}</SurfaceToneContext.Provider>
  );
}

/** Ton du fond courant. `'light'` hors de tout écran immersif. */
export function useSurfaceTone(): Tone {
  return useContext(SurfaceToneContext);
}

/** Raccourci de lecture : `const onBlue = useOnBlue();`. */
export function useOnBlue(): boolean {
  return useContext(SurfaceToneContext) === 'blue';
}
