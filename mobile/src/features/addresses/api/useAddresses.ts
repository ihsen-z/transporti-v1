import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';

/**
 * C5.9 — le carnet d'adresses.
 *
 * Endpoints livrés le 01/09/2026, exposés sur les DEUX surfaces API. Le mobile
 * ne consomme que `/api/v1/`, que la `baseURL` du client porte déjà : les
 * chemins sont donc relatifs.
 *
 * Le carnet est cloisonné par utilisateur côté serveur (`get_queryset` filtré
 * sur le jeton) ; rien n'est à filtrer ici.
 */

export interface AdresseEnregistreeDto {
  id: number;
  label: string;
  address: string;
  governorate: string;
  /** Nullables : un lieu peut n'être connu que par son gouvernorat. */
  lat: string | null;
  lng: string | null;
  created_at: string;
  updated_at: string;
}

export type AdresseAEnregistrer = Pick<
  AdresseEnregistreeDto,
  'label' | 'address' | 'governorate'
>;

export type CarnetErrorKind = 'validation' | 'network' | 'unknown';

export class CarnetError extends Error {
  constructor(public readonly kind: CarnetErrorKind) {
    super(kind);
    this.name = 'CarnetError';
  }
}

function traduireErreur(err: unknown): CarnetError {
  if (isAxiosError(err)) {
    // 400 couvre le nom déjà pris et le plafond du carnet : le serveur renvoie
    // un message précis pour chacun, l'écran n'a pas à les deviner.
    if (err.response?.status === 400) return new CarnetError('validation');
    if (!err.response) return new CarnetError('network');
  }
  return new CarnetError('unknown');
}

export const CLE_CARNET = ['savedAddresses'] as const;

async function lireCarnet(): Promise<AdresseEnregistreeDto[]> {
  const res = await apiClient.get<
    AdresseEnregistreeDto[] | { results?: AdresseEnregistreeDto[] }
  >('addresses/');
  return Array.isArray(res.data) ? res.data : (res.data.results ?? []);
}

/**
 * @param actif permet de ne pas interroger le serveur tant que le panneau est
 *   fermé — la même précaution que `useTransporterProfile`.
 */
export function useAddresses(actif = true) {
  return useQuery({
    queryKey: CLE_CARNET,
    queryFn: lireCarnet,
    enabled: actif,
  });
}

export function useSaveAddress() {
  const queryClient = useQueryClient();

  return useMutation<
    AdresseEnregistreeDto,
    CarnetError,
    { id: number | null; champs: AdresseAEnregistrer }
  >({
    mutationFn: async ({ id, champs }) => {
      try {
        const res =
          id === null
            ? await apiClient.post<AdresseEnregistreeDto>('addresses/', champs)
            : await apiClient.patch<AdresseEnregistreeDto>(
                `addresses/${id}/`,
                champs,
              );
        return res.data;
      } catch (err) {
        throw traduireErreur(err);
      }
    },
    // Le carnet n'est PAS mis en cache côté serveur, contrairement au profil
    // public : une relecture rend bien la valeur qu'on vient d'écrire.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLE_CARNET });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();

  return useMutation<void, CarnetError, number>({
    mutationFn: async (id) => {
      try {
        await apiClient.delete(`addresses/${id}/`);
      } catch (err) {
        throw traduireErreur(err);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLE_CARNET });
    },
  });
}
