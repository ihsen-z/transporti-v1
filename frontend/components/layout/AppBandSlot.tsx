"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";

/* -------------------------------------------------------------------------- */
/*  Lucarne du bandeau bleu — charte §4                                       */
/*                                                                            */
/*  « Le chevauchement carte-verre / bandeau est la signature : la carte      */
/*  commence dans le bleu et descend sur le fond clair. »                     */
/*                                                                            */
/*  Pour que ce soit vrai, la carte doit être RENDUE DANS le bandeau, et non  */
/*  posée en dessous avec une marge négative : sinon la majeure partie de la  */
/*  carte se retrouve sur le fond clair, où son texte blanc devient           */
/*  illisible — et le verre n'a plus le bleu dont il tire son effet.          */
/*                                                                            */
/*  La coquille applicative expose donc une lucarne dans son bandeau, et      */
/*  chaque écran y projette son contenu depuis l'endroit du code où il est    */
/*  naturel de l'écrire. Le bandeau grandit pour contenir la carte (190–300px */
/*  selon l'écran, comme la charte le prescrit), et la carte déborde du bas   */
/*  par une marge négative : c'est ce débord, et lui seul, qui produit le     */
/*  chevauchement.                                                           */
/* -------------------------------------------------------------------------- */

interface BandSlot {
  /** Conteneur monté dans le bandeau, ou null avant le premier montage. */
  noeud: HTMLDivElement | null;
  attacher: (noeud: HTMLDivElement | null) => void;
}

const BandSlotContext = createContext<BandSlot>({
  noeud: null,
  attacher: () => {},
});

export function AppBandProvider({ children }: { children: React.ReactNode }) {
  const [noeud, setNoeud] = useState<HTMLDivElement | null>(null);
  const valeur = useMemo<BandSlot>(
    () => ({ noeud, attacher: setNoeud }),
    [noeud],
  );
  return (
    <BandSlotContext.Provider value={valeur}>
      {children}
    </BandSlotContext.Provider>
  );
}

/**
 * Place la lucarne. Rendu par la coquille applicative, à l'intérieur du
 * bandeau bleu, sous la rangée d'actions et le titre d'écran.
 */
export function AppBandTarget({ className = "" }: { className?: string }) {
  const { attacher } = useContext(BandSlotContext);
  return <div ref={attacher} className={className} />;
}

/**
 * Projette son contenu dans le bandeau bleu.
 *
 * Rend `null` au premier passage — le temps que la coquille monte sa lucarne —
 * puis le contenu apparaît dans le bandeau. Hors coquille applicative, le
 * contenu est rendu sur place, ce qui laisse le composant réutilisable.
 */
export function AppBandContent({ children }: { children: React.ReactNode }) {
  const { noeud } = useContext(BandSlotContext);
  const [monte, setMonte] = useState(false);

  useEffect(() => setMonte(true), []);

  if (!monte) return null;
  if (!noeud) return <>{children}</>;
  return createPortal(children, noeud);
}
