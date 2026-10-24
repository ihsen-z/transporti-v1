import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize } from '@/shared/theme';
import type { MyRequestDto } from '../api/dto';
import { useMyRequests } from '../api/useMyRequests';
import { MyRequestCard } from './MyRequestCard';
import { ongletDeLaDemande, type OngletDemande } from '../model/onglets';
import { Txt } from '@/shared/ui/Txt';

interface Props {
  /** Onglet actif. Sans lui, toutes les demandes sont affichées. */
  onglet?: OngletDemande;
}

// Liste des demandes envoyées par le client (rendue via .map car imbriquée
// dans le ScrollView de l'écran « Mes demandes »).
export function MyRequestsList({ onglet }: Props = {}) {
  const { t } = useTranslation();
  const requests = useMyRequests();
  // `?? []` produit une union `MyRequestDto[] | never[]` que TS ne resout pas
  // sur `.filter` : la variable est annotee explicitement.
  const toutes: MyRequestDto[] = requests.data ?? [];
  const data = onglet
    ? toutes.filter((r) => ongletDeLaDemande(r) === onglet)
    : toutes;

  return (
    <View style={styles.wrap}>
      {requests.isLoading ? (
        <ActivityIndicator color={colors.brand[500]} />
      ) : data.length === 0 ? (
        <Txt style={styles.empty} testID="mes-demandes-vide">
          {onglet ? t(`my_requests.empty_tabs.${onglet}`) : t('my_requests.empty')}
        </Txt>
      ) : (
        data.map((r: MyRequestDto) => <MyRequestCard key={r.id} request={r} />)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  empty: { fontSize: fontSize.md, color: colors.neutral[500] },
});
