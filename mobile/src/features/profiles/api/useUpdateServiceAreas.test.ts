import { QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { TransporterProfileDto } from './dto';
import {
  patchServiceAreas,
  rangerProfilDansLeCache,
  UpdateServiceAreasError,
} from './useUpdateServiceAreas';

/**
 * L'écriture des zones de service face au cache serveur de 120 s.
 *
 * Le profil public est mis en cache côté serveur (`CACHE_TTL_PROFILE`).
 * Constaté par appel réel : juste après un PATCH, le GET renvoie encore
 * l'ancienne valeur. Une invalidation de la requête déclencherait donc une
 * relecture PÉRIMÉE, et le transporteur qui rouvre le panneau dans l'intervalle
 * verrait ses anciennes zones — puis, en enregistrant, annulerait sa propre
 * modification. Sans erreur, sans signal.
 *
 * D'où la règle que ce test fixe : la réponse du PATCH est ÉCRITE dans le cache,
 * et la requête du profil n'est jamais invalidée.
 *
 * Aucun hook n'est rendu ici, à dessein : `renderHook` avec react-query laisse
 * des écouteurs actifs et fait échouer jest sur une fuite de worker. C'est
 * pourquoi la logique de cache vit dans une fonction exportée à part.
 */

jest.mock('@/core/api/client', () => ({
  apiClient: { patch: jest.fn() },
}));

const patchMock = apiClient.patch as jest.Mock;

const PROFIL_A_JOUR = {
  first_name: 'Mehdi',
  service_areas: ['Tunis', 'Sfax'],
} as unknown as TransporterProfileDto;

const PROFIL_PERIME = {
  first_name: 'Mehdi',
  service_areas: ['Sousse'],
} as unknown as TransporterProfileDto;

beforeEach(() => {
  patchMock.mockReset();
  patchMock.mockResolvedValue({
    data: { message: 'ok', profile: PROFIL_A_JOUR },
  });
});

describe('patchServiceAreas', () => {
  it("n'envoie que service_areas, sur le bon chemin", async () => {
    // Chemin relatif : la baseURL du client porte deja /api/v1. Reenvoyer les
    // autres champs du profil risquerait d'ecraser une valeur modifiee ailleurs
    // entre-temps.
    await patchServiceAreas(['Tunis', 'Sfax']);

    expect(patchMock).toHaveBeenCalledWith('transporter/profile/me/', {
      service_areas: ['Tunis', 'Sfax'],
    });
  });

  it('traduit une absence de reponse en erreur reseau', async () => {
    patchMock.mockRejectedValue(
      Object.assign(new Error('boom'), { isAxiosError: true, response: undefined }),
    );

    // L'ecran distingue reseau et validation pour son message : confondre les
    // deux dirait « corrigez votre saisie » sur une coupure de reseau.
    await expect(patchServiceAreas(['Tunis'])).rejects.toMatchObject({
      kind: 'network',
    });
  });

  it('traduit un 400 en erreur de validation', async () => {
    patchMock.mockRejectedValue(
      Object.assign(new Error('boom'), {
        isAxiosError: true,
        response: { status: 400 },
      }),
    );

    await expect(patchServiceAreas(['Zzz'])).rejects.toMatchObject({
      kind: 'validation',
    });
  });

  it('ne laisse jamais fuir une erreur brute vers l ecran', async () => {
    patchMock.mockRejectedValue(new Error('quelque chose de tout autre'));

    await expect(patchServiceAreas(['Tunis'])).rejects.toBeInstanceOf(
      UpdateServiceAreasError,
    );
  });
});

describe('rangerProfilDansLeCache', () => {
  it('ecrit la reponse au lieu de faire relire le profil', () => {
    const client = new QueryClient();
    // Le cache porte la valeur d'AVANT, comme apres une lecture anterieure.
    client.setQueryData(['transporterProfile', 51], PROFIL_PERIME);
    const invalider = jest.spyOn(client, 'invalidateQueries');

    rangerProfilDansLeCache(client, 51, PROFIL_A_JOUR);

    expect(client.getQueryData(['transporterProfile', 51])).toEqual(PROFIL_A_JOUR);

    const clesInvalidees = invalider.mock.calls.map(
      (appel) => (appel[0] as { queryKey?: unknown[] })?.queryKey?.[0],
    );
    // Le point qui compte : le profil n'est PAS invalide. Le serait-il, la
    // relecture rendrait ['Sousse'] pendant deux minutes.
    expect(clesInvalidees).not.toContain('transporterProfile');
    expect(clesInvalidees).toContain('performance');

    client.clear();
  });

  it('sans userId, n ecrit rien plutot que sous une mauvaise cle', () => {
    const client = new QueryClient();

    rangerProfilDansLeCache(client, null, PROFIL_A_JOUR);

    expect(client.getQueryData(['transporterProfile', null])).toBeUndefined();
    client.clear();
  });
});
