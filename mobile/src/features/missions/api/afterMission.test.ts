import { QueryClient } from '@tanstack/react-query';
import {
  QUERIES_AFTER_DELIVERY,
  QUERIES_AFTER_MISSION_CHANGE,
  invalidateAll,
} from './afterMission';
import { walletKey } from '@/features/wallet/api/useWallet';

describe('afterMission', () => {
  it('une livraison rafraîchit les gains et la dette, pas seulement les missions', () => {
    const cles = QUERIES_AFTER_DELIVERY.map((k) => k[0]);
    expect(cles).toEqual(
      expect.arrayContaining(['myMissions', 'transporterStats', 'wallet']),
    );
  });

  it('utilise la vraie clé du portefeuille', () => {
    // Une faute de frappe ici rendrait l'invalidation muette.
    expect(QUERIES_AFTER_DELIVERY).toContainEqual([...walletKey]);
  });

  it('un démarrage ou une annulation ne recharge pas le portefeuille', () => {
    const cles = QUERIES_AFTER_MISSION_CHANGE.map((k) => k[0]);
    expect(cles).not.toContain('wallet');
  });

  it('invalide chaque clé demandée', () => {
    const qc = new QueryClient();
    const espion = jest.spyOn(qc, 'invalidateQueries').mockResolvedValue();
    invalidateAll(qc, QUERIES_AFTER_DELIVERY);
    expect(espion).toHaveBeenCalledTimes(QUERIES_AFTER_DELIVERY.length);
    expect(espion).toHaveBeenCalledWith({ queryKey: ['wallet'] });
  });
});
