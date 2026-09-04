import { z } from 'zod';

// Schéma de la demande cliente sur un trajet retour (lot 6.1). Les messages
// sont des CLÉS i18n, traduites au rendu — schéma statique, comme publishSchema.
//
// Ce qui décrit la marchandise est facultatif côté serveur : une demande
// minimale doit rester envoyable. On ne valide donc pas la présence, mais la
// COHÉRENCE — un poids nul, un créneau qui finit avant de commencer, une
// adresse sans gouvernorat. Seules la description et le prix restent requis :
// ce sont les deux éléments sur lesquels le transporteur décide.

/**
 * Décimal positif ou vide. Le vide est la façon de ne pas répondre ; `0` n'en
 * est pas une — il s'afficherait comme une donnée renseignée sans rien dire.
 * Même raison que `validate_weight_kg` côté serveur.
 */
const decimalPositifOuVide = (cle: string) =>
  z
    .string()
    .refine((v) => v === '' || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0), cle);

export const requestSchema = z
  .object({
    goodsType: z.enum(['TRANSPORT', 'MOVING', 'DELIVERY']),
    weightKg: decimalPositifOuVide('search.errors.weight'),
    volumeM3: decimalPositifOuVide('search.errors.volume'),
    description: z.string().trim().min(1, 'search.errors.description_required'),
    pickupGov: z.string(),
    pickupAddress: z.string(),
    day: z.string(),
    fromTime: z.string(),
    untilTime: z.string(),
    price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'search.errors.price'),
    method: z.enum(['DIGITAL', 'COD']),
  })
  // Un jour choisi sans heures ne décrit aucun créneau : le transporteur
  // saurait le jour mais pas quand se présenter.
  .refine((d) => !d.day || (!!d.fromTime && !!d.untilTime), {
    message: 'search.errors.slot_incomplete',
    path: ['fromTime'],
  })
  // Les créneaux viennent de TIME_SLOTS (« 08:00 »), donc l'ordre
  // lexicographique est l'ordre horaire.
  .refine((d) => !d.fromTime || !d.untilTime || d.untilTime > d.fromTime, {
    message: 'search.errors.slot_order',
    path: ['untilTime'],
  })
  // Une adresse sans gouvernorat n'est pas localisable par le transporteur.
  .refine((d) => !d.pickupAddress.trim() || !!d.pickupGov, {
    message: 'search.errors.gov_required',
    path: ['pickupGov'],
  });

export type RequestFormValues = z.infer<typeof requestSchema>;

/** Option d'un Select (valeur + libellé localisé). */
export interface RequestOption {
  value: string;
  label: string;
}

/** Nombre de photos accepté par la demande. Trois suffisent à décider. */
export const MAX_PHOTOS = 3;
