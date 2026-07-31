import { z } from 'zod';

// Schéma de publication d'un retour à vide (TRANSPORTER). Les messages sont des
// CLÉS i18n (traduites au rendu) => schéma statique. Les coordonnées ne sont pas
// saisies : elles proviennent du gouvernorat choisi (findGovernorate).
export const publishSchema = z
  .object({
    jobType: z.enum(['TRANSPORT', 'MOVING']),
    pickupGov: z.string().min(1, 'trips.errors.required'),
    pickupAddress: z.string().min(1, 'trips.errors.required'),
    dropoffGov: z.string().min(1, 'trips.errors.required'),
    dropoffAddress: z.string().min(1, 'trips.errors.required'),
    day: z.string().min(1, 'trips.errors.required'),
    time: z.string().min(1, 'trips.errors.required'),
    priceMin: z.string().regex(/^\d+(\.\d{1,2})?$/, 'trips.errors.price'),
    priceMax: z.string().regex(/^\d+(\.\d{1,2})?$/, 'trips.errors.price'),
    capacity: z.string(),
    description: z.string(),
    instantBooking: z.boolean(),
  })
  .refine((d) => Number(d.priceMax) >= Number(d.priceMin), {
    message: 'trips.errors.price_range',
    path: ['priceMax'],
  });

export type PublishFormValues = z.infer<typeof publishSchema>;

// Option d'un Select (valeur + libellé localisé).
export interface FormOption {
  value: string;
  label: string;
}
