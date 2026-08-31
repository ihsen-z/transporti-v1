"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookMarked } from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { getAdresses, type AdresseEnregistree } from "@/lib/services/addresses";

interface Props {
  /** Appelé avec l'adresse choisie. L'appelant décide quels champs remplir. */
  onChoisir: (adresse: AdresseEnregistree) => void;
  /** `pickup` ou `dropoff` — sert uniquement aux identifiants de test. */
  cible: string;
}

/**
 * C5.9 — le sélecteur du carnet, dans le formulaire de publication.
 *
 * **C'est ici que le carnet sert.** Une page de gestion d'adresses que rien ne
 * consomme serait un écran de plus à entretenir et zéro friction supprimée —
 * exactement le défaut de la moitié prospective de T5.4, livrée puis inerte
 * faute de zones déclarées. Le carnet n'a de valeur qu'au moment de la saisie.
 *
 * Le composant ne rend RIEN tant que le carnet est vide : un bloc « aucune
 * adresse » au-dessus de chaque champ n'aiderait personne et alourdirait un
 * formulaire déjà long. Il ne rend rien non plus pendant le chargement, pour la
 * même raison — il apparaît quand il a quelque chose à proposer.
 *
 * Un échec de lecture est traité comme un carnet vide, et c'est le SEUL endroit
 * de cette fonctionnalité où c'est acceptable : le formulaire reste
 * intégralement utilisable à la main, et afficher une erreur sur un confort
 * optionnel détournerait l'attention de la saisie en cours. La page
 * `/compte/adresses`, elle, remonte ses erreurs.
 */
export function SavedAddressPicker({ onChoisir, cible }: Props) {
  const { t } = useAppI18n();
  const a = t.addressBook;
  const [adresses, setAdresses] = useState<AdresseEnregistree[]>([]);

  useEffect(() => {
    let annule = false;
    void getAdresses()
      .then((liste) => {
        if (!annule) setAdresses(liste);
      })
      .catch(() => {
        // Voir la note d'en-tête : un confort optionnel ne doit pas parasiter
        // la saisie. Le formulaire reste utilisable sans le carnet.
        if (!annule) setAdresses([]);
      });
    return () => {
      annule = true;
    };
  }, []);

  if (adresses.length === 0) return null;

  return (
    <div
      data-testid={`carnet-selecteur-${cible}`}
      className="mb-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3"
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600">
          <BookMarked className="w-3.5 h-3.5" />
          {a.pickTitle}
        </span>
        <Link
          href="/compte/adresses"
          className="text-xs text-brand-600 hover:text-brand-700 font-medium"
        >
          {a.pickManage}
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {adresses.map((adresse) => (
          <button
            key={adresse.id}
            type="button"
            data-testid={`carnet-choix-${cible}-${adresse.id}`}
            onClick={() => onChoisir(adresse)}
            className="px-3 py-1.5 rounded-full border border-neutral-200 bg-white text-xs font-medium text-neutral-700 hover:border-brand-600 hover:text-brand-600 transition-colors"
            // Le gouvernorat est dans l'info-bulle et non sur la pastille :
            // deux lieux peuvent porter des noms proches, et c'est lui qui les
            // distingue au moment du choix.
            title={`${adresse.address} — ${adresse.governorate}`}
          >
            {adresse.label}
          </button>
        ))}
      </div>
    </div>
  );
}
