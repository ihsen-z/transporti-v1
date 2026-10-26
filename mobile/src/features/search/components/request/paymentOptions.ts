import type { TFunction } from 'i18next';
import type { PaymentConfig } from '@/features/payments/api/usePaymentConfig';
import { formatAmount } from '@/shared/format/money';
import type { RequestOption } from './requestSchema';

// Les modes de paiement proposés dans la demande.
//
// En mode « espèces seules » (le serveur répond online_payment_enabled:
// false), l'option en ligne n'est pas rendue : le serveur la refuserait.
// Les espèces restent toujours proposées, avec le plafond du serveur.
export function paymentOptions(config: PaymentConfig, t: TFunction): RequestOption[] {
  const especes: RequestOption = {
    value: 'COD',
    label: t('search.request.method_cod', { max: formatAmount(config.cod_max_amount) }),
  };
  if (!config.online_payment_enabled) return [especes];
  return [especes, { value: 'DIGITAL', label: t('search.request.method_digital') }];
}
