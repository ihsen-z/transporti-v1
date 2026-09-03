import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import { extractServerMessage } from '@/core/api/serverMessage';

export type DeleteAccountErrorKind = 'password_wrong' | 'blocked' | 'network' | 'unknown';

export class DeleteAccountError extends Error {
  // `serverMessage` porte le motif exact du refus ET ce qu'il faut faire pour
  // le lever (« Vous avez 2 mission(s) en cours. Terminez-les… »). Le
  // reformuler ici ferait deux sources pour une même règle.
  constructor(
    public readonly kind: DeleteAccountErrorKind,
    public readonly serverMessage?: string,
  ) {
    super(kind);
    this.name = 'DeleteAccountError';
  }
}

// Le serveur distingue deux refus sous le même 400 :
//   `{password: "…"}` mot de passe manquant ou faux
//   `{error: "…"}`    règle métier (mission en cours, dette COD, solde à retirer)
function classer(data: unknown): DeleteAccountErrorKind {
  if (data && typeof data === 'object' && 'password' in data) return 'password_wrong';
  return 'blocked';
}

// DELETE auth/account/ — clôture du compte de l'utilisateur connecté.
//
// Le serveur ANONYMISE plutôt qu'il ne supprime : `TransportJob.owner` et
// `Offer.transporter` sont en `PROTECT`, les missions passées survivent donc à
// la clôture. Côté mobile cela ne change rien : la session doit tomber.
async function deleteAccount(password: string): Promise<void> {
  try {
    await apiClient.delete('auth/account/', { data: { password } });
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 400) {
        throw new DeleteAccountError(
          classer(err.response.data),
          extractServerMessage(err.response.data) ?? undefined,
        );
      }
      if (!err.response) throw new DeleteAccountError('network');
    }
    throw new DeleteAccountError('unknown');
  }
}

export function useDeleteAccount() {
  return useMutation<void, DeleteAccountError, string>({
    mutationFn: deleteAccount,
  });
}
