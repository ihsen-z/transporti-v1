import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { Card } from '@/shared/ui/Card';
import { colors, spacing, fontSize } from '@/shared/theme';
import { SearchForm } from './SearchForm';
import type { GoodsFilterValues } from './GoodsFilters';
import type { MatchParams } from '../api/dto';

/**
 * Lot 7.5 — l'accueil cliente (E-17, story C-02).
 *
 * L'écran d'arrivée du persona secondaire tenait en un bandeau de marque et un
 * bouton : le contenu s'arrêtait au premier tiers, et les deux autres étaient
 * vides. Le transporteur, lui, est guidé ; la cliente était accueillie par du
 * marketing.
 *
 * La cartographie assume que la cliente n'a pas de tableau de bord et que sa
 * racine est la RECHERCHE. Il fallait donc aller au bout : mettre la recherche
 * elle-même sur l'accueil, et non un bouton qui y mène.
 *
 * Le corridor choisi part en paramètres de route ; l'écran de recherche s'ouvre
 * déjà rempli et lance la requête. Sans cela on aurait deux formulaires et une
 * saisie à refaire — exactement ce que ce lot cherche à supprimer.
 */
export function ClientHomeSearch() {
  const { t } = useTranslation();
  const router = useRouter();
  const [pickup, setPickup] = useState<string | null>(null);
  const [dropoff, setDropoff] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  // Les filtres marchandise n'ont pas leur place sur l'accueil : ils affinent
  // une recherche, ils ne l'amorcent pas. Ils restent sur l'écran dédié.
  const [filtres, setFiltres] = useState<GoodsFilterValues>({
    jobType: '',
    weight: '',
    volume: '',
  });

  const lancer = (params: MatchParams) => {
    router.push({
      pathname: '/search',
      params: {
        pickup: params.pickup_governorate,
        dropoff: params.dropoff_governorate,
        ...(params.date ? { day: params.date } : {}),
      },
    });
  };

  return (
    <Card style={s.carte}>
      <Txt style={s.titre}>{t('home.client.search_title')}</Txt>
      <Txt style={s.sousTitre}>{t('home.client.search_subtitle')}</Txt>
      <View style={s.formulaire}>
        <SearchForm
          onSearch={lancer}
          loading={false}
          day={day}
          onDayChange={setDay}
          filtres={filtres}
          onFiltresChange={setFiltres}
          pickup={pickup}
          dropoff={dropoff}
          onPickupChange={setPickup}
          onDropoffChange={setDropoff}
        />
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  carte: { gap: spacing.sm },
  titre: { fontSize: fontSize.lg, fontWeight: '800', color: colors.neutral[900] },
  sousTitre: { fontSize: fontSize.md, color: colors.neutral[500] },
  formulaire: { marginTop: spacing.sm },
});
