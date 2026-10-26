import type { TFunction } from 'i18next';
import { PAYMENT_CONFIG_DEFAUT } from '@/features/payments/api/usePaymentConfig';
import { paymentOptions } from './paymentOptions';

// Faux `t` : rend la clé et le plafond interpolé, assez pour vérifier le
// libellé sans charger les traductions.
const t = ((cle: string, valeurs?: { max?: string }) =>
  valeurs?.max ? `${cle}(${valeurs.max})` : cle) as unknown as TFunction;

describe('paymentOptions', () => {
  it("en mode « espèces seules », ne propose que les espèces", () => {
    const options = paymentOptions({ ...PAYMENT_CONFIG_DEFAUT, online_payment_enabled: false }, t);

    expect(options.map((o) => o.value)).toEqual(['COD']);
  });

  it('avec le paiement en ligne ouvert, propose les espèces puis le paiement en ligne', () => {
    const options = paymentOptions({ ...PAYMENT_CONFIG_DEFAUT, online_payment_enabled: true }, t);

    expect(options.map((o) => o.value)).toEqual(['COD', 'DIGITAL']);
  });

  it('cite le plafond espèces du serveur', () => {
    const [especes] = paymentOptions({ ...PAYMENT_CONFIG_DEFAUT, cod_max_amount: 450 }, t);

    expect(especes?.label).toContain('450');
  });

  it("tant que le serveur n'a pas répondu, l'option en ligne reste masquée", () => {
    // Les espèces marchent toujours ; un paiement en ligne proposé à tort
    // serait refusé par le serveur.
    expect(PAYMENT_CONFIG_DEFAUT.online_payment_enabled).toBe(false);
  });
});
