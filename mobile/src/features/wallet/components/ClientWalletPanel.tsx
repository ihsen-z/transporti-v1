import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PanelScreen } from '@/shared/ui/PanelScreen';
import { queryRefreshControl } from '@/shared/ui/queryRefreshControl';
import { formatAmount } from '@/shared/format/money';
import { colors, spacing, fontSize } from '@/shared/theme';
import { useClientWallet } from '../api/useClientWallet';
import type { ClientWalletHistoryEntry } from '../api/dto';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * C5.1 — le portefeuille du CLIENT, jumeau mobile de l'écran web.
 *
 * L'endpoint `client/wallet/` a été écrit pour ce lot : `wallet/` porte
 * `RequireRole('TRANSPORTER')` et répond 403 à un client. L'audit du plan le
 * présentait comme réutilisable côté client — il ne l'était pas.
 *
 * ÉCART DE PLACE ASSUMÉ avec le web : la charte mobile n'ouvre pas d'onglet
 * pour un client, donc ceci vit dans un panneau du Profil, comme les avis et
 * les favoris. Le contenu, lui, est identique.
 *
 * Un client n'a PAS de solde : il n'a rien à retirer. Les quatre montants ne
 * s'additionnent pas, et le panneau le dit — les cumuler donnerait un chiffre
 * sans réalité comptable. Le backend ne renvoie d'ailleurs aucun total.
 */
export function ClientWalletPanel({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const portefeuille = useClientWallet(visible);
  const d = portefeuille.data;

  const tuiles = d
    ? ([
        { cle: 'held', montant: d.held },
        { cle: 'released', montant: d.released },
        { cle: 'refunded', montant: d.refunded },
        { cle: 'cod_pending', montant: d.cod_pending },
      ] as const)
    : [];

  const rendreMouvement = ({ item }: { item: ClientWalletHistoryEntry }) => (
    <Card>
      <View style={styles.mouvement} testID="portefeuille-client-mouvement">
        <View style={styles.gauche}>
          <Txt style={styles.corridor}>
            {item.pickup_governorate} → {item.dropoff_governorate}
          </Txt>
          {/* Statut rendu TEL QUEL : le traduire en « payé » inventerait une
              lecture que la machine à états de l'escrow ne garantit pas. */}
          <Txt style={styles.statut}>{item.status}</Txt>
        </View>
        <Txt style={styles.montant}>{formatAmount(item.amount)}</Txt>
      </View>
    </Card>
  );

  return (
    <PanelScreen
      visible={visible}
      title={t('client_wallet.title')}
      onClose={onClose}
      testID="portefeuille-client"
      scroll={false}
    >
      {portefeuille.isLoading ? (
        <ActivityIndicator style={styles.chargement} color={colors.brand[500]} />
      ) : (
        <FlatList
          data={d?.history ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={rendreMouvement}
          contentContainerStyle={styles.liste}
          refreshControl={queryRefreshControl(portefeuille)}
          ListHeaderComponent={
            <View style={styles.entete}>
              <View style={styles.tuiles} testID="portefeuille-client-tuiles">
                {tuiles.map(({ cle, montant }) => (
                  <Card key={cle}>
                    <View testID={`portefeuille-client-${cle}`}>
                      <Txt style={styles.libelle}>{t(`client_wallet.${cle}`)}</Txt>
                      <Txt style={styles.chiffre}>{formatAmount(montant)}</Txt>
                    </View>
                  </Card>
                ))}
              </View>
              {/* Dit explicitement ce que les tuiles ne doivent PAS
                    suggérer : ces montants ne se cumulent pas. */}
              <Txt style={styles.avertissement}>{t('client_wallet.no_total')}</Txt>
              <Txt style={styles.sousTitre}>{t('client_wallet.history_title')}</Txt>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="wallet"
              title={t('client_wallet.empty_title')}
              subtitle={t('client_wallet.empty_body')}
              testID="portefeuille-client-vide"
            />
          }
        />
      )}
    </PanelScreen>
  );
}

const styles = StyleSheet.create({
  titre: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.neutral[900],
  },
  chargement: { marginTop: spacing.xl },
  liste: { padding: spacing.xl, gap: spacing.md },
  entete: { gap: spacing.md, marginBottom: spacing.md },
  tuiles: { gap: spacing.md },
  libelle: { fontSize: fontSize.sm, color: colors.neutral[500] },
  chiffre: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.neutral[900],
  },
  avertissement: { fontSize: fontSize.sm, color: colors.neutral[500] },
  sousTitre: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  mouvement: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  gauche: { flex: 1 },
  corridor: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  statut: { fontSize: fontSize.sm, color: colors.neutral[500] },
  montant: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.neutral[900],
  },
});
