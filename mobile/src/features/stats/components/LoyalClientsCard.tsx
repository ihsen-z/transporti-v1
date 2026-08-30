import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/icons';
import { Txt } from '@/shared/ui/Txt';
import { Card } from '@/shared/ui/Card';
import { colors, spacing, fontSize } from '@/shared/theme';
import type { FideliteDto } from '../api/dto';

interface Props {
  fidelite: FideliteDto;
}

/**
 * T5.5 — les clients fidèles, jumeau mobile de la section web.
 *
 * Pendant de C5.3 : le client met un transporteur en favori, le transporteur
 * veut savoir qui, et avec qui il a déjà travaillé.
 *
 * Les deux signaux restent SÉPARÉS. Un client à six missions sans favori est
 * plus fidèle qu'un favori qui n'a jamais réservé : afficher un score unique
 * effacerait la différence, et le backend n'en renvoie aucun.
 *
 * Zéro mission chez un favori n'est pas « zéro » : c'est « intéressé, jamais
 * converti ». Deux situations, deux libellés.
 */
export function LoyalClientsCard({ fidelite }: Props) {
  const { t } = useTranslation();

  return (
    <Card>
      <Txt style={styles.titre}>{t('loyal_clients.title')}</Txt>

      <View style={styles.compteurs}>
        <Txt style={styles.compteur} testID="fidelite-favoris">
          {t('loyal_clients.favorited', { count: fidelite.favorited_by })}
        </Txt>
        <Txt style={styles.compteur} testID="fidelite-recurrents">
          {t('loyal_clients.repeat', { count: fidelite.repeat_clients })}
        </Txt>
      </View>

      {fidelite.clients.length > 0 ? (
        <View style={styles.liste} testID="fidelite-clients">
          {fidelite.clients.map((client) => (
            <View
              key={client.client_id}
              testID="fidelite-client-ligne"
              style={styles.ligne}
            >
              <View style={styles.gauche}>
                <View style={styles.nomLigne}>
                  <Txt style={styles.nom}>{client.client_name}</Txt>
                  {client.is_favorite && (
                    <Icon name="heart" size={14} color={colors.error} />
                  )}
                </View>
                <Txt style={styles.detail}>
                  {client.missions > 0
                    ? t('loyal_clients.missions', { count: client.missions })
                    : t('loyal_clients.never_booked')}
                </Txt>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Txt style={styles.vide} testID="fidelite-vide">
          {t('loyal_clients.empty')}
        </Txt>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  titre: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  compteurs: { gap: spacing.xs, marginBottom: spacing.md },
  compteur: { fontSize: fontSize.sm, color: colors.neutral[500] },
  liste: { gap: spacing.md },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  gauche: { flex: 1 },
  nomLigne: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nom: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  detail: { fontSize: fontSize.sm, color: colors.neutral[500] },
  vide: { fontSize: fontSize.sm, color: colors.neutral[500] },
});
