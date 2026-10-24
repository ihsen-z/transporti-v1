"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/* -------------------------------------------------------------------------- */
/*  Barre d'action fixe — charte §3                                           */
/*                                                                            */
/*  Bandeau bas blanc 0.96, bord haut #E6EBF3, padding 14px 20px 22px :       */
/*  total à gauche (label 11.5px + 20px/800), CTA orange en flex:1 à droite.  */
/*                                                                            */
/*  Une barre d'action REMPLACE la navigation basse sur mobile. Les deux       */
/*  porteraient chacune un orange, et la charte n'en autorise qu'un par        */
/*  écran : c'est l'action de l'écran qui gagne, pas le raccourci de           */
/*  publication. Le contexte ci-dessous permet à la coquille applicative de    */
/*  savoir qu'une barre est montée.                                           */
/* -------------------------------------------------------------------------- */

interface ActionBarState {
  /** Vrai dès qu'une <ActionBar/> est montée dans l'arbre. */
  present: boolean;
  declarer: (present: boolean) => void;
}

const ActionBarContext = createContext<ActionBarState>({
  present: false,
  declarer: () => {},
});

export function ActionBarProvider({ children }: { children: React.ReactNode }) {
  const [present, setPresent] = useState(false);
  const valeur = useMemo(() => ({ present, declarer: setPresent }), [present]);
  return (
    <ActionBarContext.Provider value={valeur}>
      {children}
    </ActionBarContext.Provider>
  );
}

/** Lu par la coquille applicative pour masquer la navigation basse. */
export function useActionBarPresente(): boolean {
  return useContext(ActionBarContext).present;
}

export interface ActionBarProps {
  /** Libellé du montant, par exemple « Total à payer » */
  totalLabel?: string;
  /** Montant déjà formaté, par exemple « 240 TND » */
  totalValue?: string;
  /** Le CTA de l'écran — un seul, et c'est le seul orange autorisé ici. */
  children: React.ReactNode;
}

export function ActionBar({
  totalLabel,
  totalValue,
  children,
}: ActionBarProps) {
  const { declarer } = useContext(ActionBarContext);

  // La barre signale sa présence tant qu'elle est montée, et la retire en
  // partant : la navigation basse revient dès qu'on quitte l'écran.
  useEffect(() => {
    declarer(true);
    return () => declarer(false);
  }, [declarer]);

  return (
    <>
      {/* Réserve de place : sans elle, la barre masque la fin du contenu. */}
      <div aria-hidden className="h-[96px]" />

      <div className="fixed inset-x-0 bottom-0 z-fixed lg:ms-64">
        <div className="action-bar mx-auto max-w-4xl">
          {totalValue && (
            <div className="flex min-w-0 flex-col">
              {totalLabel && (
                <span className="action-bar__label">{totalLabel}</span>
              )}
              <span className="action-bar__total">{totalValue}</span>
            </div>
          )}
          <div className="flex flex-1 justify-end">{children}</div>
        </div>
      </div>
    </>
  );
}

export default ActionBar;
