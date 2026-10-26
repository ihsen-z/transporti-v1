import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { colors, fontSize, spacing } from '@/shared/theme';
import { formatAmount } from '@/shared/format/money';
import { useWallet } from '../api/useWallet';

// À partir de la moitié du plafond, on prévient : le blocage ne doit jamais
// tomber sans avertissement préalable.
const SEUIL_AVERTISSEMENT = 0.5;

export type DebtStatus = 'none' | 'warning' | 'blocked';

export function debtStatus(debt: number, limit: number, blocked: boolean): DebtStatus {
  if (blocked) return 'blocked';
  if (limit > 0 && debt >= limit * SEUIL_AVERTISSEMENT) return 'warning';
  return 'none';
}

/**
 * Bandeau de dette de commission, côté transporteur.
 *
 * Le serveur bloque les nouvelles courses au-delà du plafond (payments/debt.py),
 * mais rien ne le disait AVANT que le transporteur se heurte à un refus : vu en
 * recette Android 16 le 25/10, l'accueil n'affichait rien avec 75 TND de dette.
 * Ce bandeau prévient à mi-plafond, puis explique le blocage et sa sortie.
 *
 * Il lit le portefeuille lui-même : posé sur l'accueil comme sur Gains, il
 * partage la même requête (même clé React Query), sans appel en double.
 */
export function DebtBanner() {
  const { t } = useTranslation();
  const wallet = useWallet(true);
  const d = wallet.data;
  if (!d) return null;

  const statut = debtStatus(d.cod_debt, d.commission_debt_limit, d.blocked_for_debt);
  if (statut === 'none') return null;

  const valeurs = {
    debt: formatAmount(d.cod_debt),
    limit: formatAmount(d.commission_debt_limit),
  };
  const bloque = statut === 'blocked';

  return (
    <View
      testID={bloque ? 'debt-banner-blocked' : 'debt-banner-warning'}
      accessibilityRole="alert"
      style={[styles.banner, bloque ? styles.blocked : styles.warning]}
    >
      <Txt
        style={[
          styles.title,
          { color: bloque ? colors.text.error : colors.text.warning },
        ]}
      >
        {bloque
          ? t('wallet.debt_blocked_title')
          : t('wallet.debt_warning_title', valeurs)}
      </Txt>
      <Txt style={styles.body}>
        {bloque
          ? t('wallet.debt_blocked_body', valeurs)
          : t('wallet.debt_warning_body', valeurs)}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 18, padding: 15, gap: spacing.xs, borderWidth: 1 },
  // Fond blanc : le rouge du texte y tient 4,83:1 (sur rose pâle il passerait
  // sous 4,5). La bordure porte la couleur.
  blocked: { backgroundColor: colors.neutral[0], borderColor: colors.errorBorder },
  warning: { backgroundColor: colors.cta[50], borderColor: colors.cta[50] },
  title: { fontSize: fontSize.md, fontWeight: '800' },
  body: {
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.5,
    color: colors.neutral[700],
  },
});
