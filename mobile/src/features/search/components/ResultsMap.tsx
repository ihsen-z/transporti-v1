import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { TOUCH_TARGET, colors, fontSize, radii, shadows, spacing } from '@/shared/theme';
import { Txt } from '@/shared/ui/Txt';
import { Icon } from '@/shared/ui/icons';
import { buildCorridors, regionFor } from '../data/corridors';
import type { TripResultDto } from '../api/dto';

// Carte des retours trouvés : un trait par corridor. Le calcul des tracés vit
// dans ../data/corridors (module pur, testé) ; ce fichier ne fait que le rendu.

// Le plugin Expo n'écrit la balise geo.API_KEY dans l'AndroidManifest que si la
// clé est renseignée ; monter un MapView Google sans elle casse l'écran. On
// affiche donc un repli explicite plutôt qu'une recherche inutilisable.
//
// Le drapeau vient de `extra`, posé par app.config.js, et NON de
// `android.config.googleMaps` : ce dernier est élagué de la config publique
// servie à l'app, donc toujours vide côté JS. Renseigner la clé exige un
// rebuild natif : ce test n'a pas besoin d'être réactif.
// `extra` est typé librement par expo-constants, d'où la comparaison stricte.
const hasMapsKey = Constants.expoConfig?.extra?.hasGoogleMapsKey === true;

interface Props {
  trips: readonly TripResultDto[];
}

export function ResultsMap({ trips }: Props) {
  const { t, i18n } = useTranslation();
  const corridors = useMemo(
    () => buildCorridors(trips, i18n.language === 'ar'),
    [trips, i18n.language],
  );
  const region = useMemo(() => regionFor(corridors), [corridors]);
  const mapRef = useRef<MapView>(null);
  const [showUser, setShowUser] = useState(false);
  // La carte est un APERCU par defaut : elle ne prend aucun geste, donc la
  // liste de resultats defile meme quand le doigt part de son milieu.
  // L'interaction s'obtient explicitement, en plein ecran.
  const [agrandie, setAgrandie] = useState(false);

  // Permission demandée à l'affichage de la carte, et non au démarrage de
  // l'app : hors contexte, l'utilisateur refuse.
  useEffect(() => {
    if (!hasMapsKey) return;
    let cancelled = false;
    void Location.requestForegroundPermissionsAsync().then((res) => {
      if (!cancelled) setShowUser(res.status === 'granted');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Recadre sur les nouveaux résultats. `initialRegion` (et non `region`)
  // laisse l'utilisateur déplacer la carte librement entre deux recherches.
  useEffect(() => {
    mapRef.current?.animateToRegion(region, 400);
  }, [region]);

  if (corridors.length === 0) return null;

  if (!hasMapsKey) {
    return (
      <View style={[styles.wrap, styles.fallback]}>
        <Txt style={styles.fallbackText}>{t('search.map_unavailable')}</Txt>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={showUser}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        // En apercu, aucun geste : c'est ce qui rend le defilement de la liste
        // possible depuis n'importe ou. Cela evite aussi de consommer du quota
        // Maps sur un geste involontaire.
        scrollEnabled={agrandie}
        zoomEnabled={agrandie}
        rotateEnabled={agrandie}
        pitchEnabled={agrandie}
      >
        {corridors.map((corridor) => (
          <Fragment key={corridor.key}>
            <Polyline
              coordinates={corridor.path}
              strokeColor={colors.brand[500]}
              strokeWidth={3}
              // Un repli en ligne droite est signalé comme tel : pointillés,
              // pour ne pas faire passer une approximation pour un itinéraire.
              lineDashPattern={corridor.isRealRoute ? undefined : [8, 6]}
            />
            <Marker
              coordinate={corridor.from}
              title={corridor.fromLabel}
              // La distance vient du serveur, du même appel de routage que le
              // tracé : les deux ne peuvent pas se contredire.
              description={
                corridor.distanceKm === null
                  ? undefined
                  : t('search.map_distance', { km: Math.round(corridor.distanceKm) })
              }
            />
            <Marker
              coordinate={corridor.to}
              title={corridor.toLabel}
              pinColor={colors.green[600]}
            />
          </Fragment>
        ))}
      </MapView>

      {/* Sortie explicite vers le mode interactif. En apercu la carte ne
          reagit a rien : sans ce bouton, l'utilisateur croirait la carte
          cassee plutot que volontairement inerte. */}
      <Pressable
        testID="results-map-expand"
        style={styles.agrandir}
        onPress={() => setAgrandie(true)}
        accessibilityRole="button"
        accessibilityLabel={t('search.map_expand')}
      >
        <Icon name="search" size={18} color={colors.brand[600]} />
        <Txt style={styles.agrandirTexte}>{t('search.map_expand')}</Txt>
      </Pressable>

      <Modal
        visible={agrandie}
        animationType="slide"
        onRequestClose={() => setAgrandie(false)}
      >
        <SafeAreaView style={styles.pleinEcran} edges={['top', 'bottom']}>
          <View style={styles.barrePleinEcran}>
            <Txt style={styles.titrePleinEcran}>{t('search.map_title')}</Txt>
            <Pressable
              testID="results-map-close"
              onPress={() => setAgrandie(false)}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              hitSlop={12}
              style={styles.fermer}
            >
              <Icon name="x" size={26} color={colors.neutral[700]} />
            </Pressable>
          </View>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.mapPleinEcran}
            initialRegion={region}
            showsUserLocation={showUser}
          >
            {corridors.map((corridor) => (
              <Fragment key={`plein-${corridor.key}`}>
                <Polyline
                  coordinates={corridor.path}
                  strokeColor={colors.brand[500]}
                  strokeWidth={3}
                  lineDashPattern={corridor.isRealRoute ? undefined : [8, 6]}
                />
                <Marker coordinate={corridor.from} title={corridor.fromLabel} />
                <Marker
                  coordinate={corridor.to}
                  title={corridor.toLabel}
                  pinColor={colors.green[600]}
                />
              </Fragment>
            ))}
          </MapView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 220,
    borderRadius: radii.card,
    overflow: 'hidden',
    ...shadows.card,
  },
  map: { flex: 1 },
  agrandir: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: TOUCH_TARGET,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.neutral[0],
    ...shadows.card,
  },
  agrandirTexte: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.brand[600],
  },
  pleinEcran: { flex: 1, backgroundColor: colors.neutral[0] },
  barrePleinEcran: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  titrePleinEcran: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.neutral[900],
  },
  fermer: {
    minWidth: TOUCH_TARGET,
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexDirection: 'row',
  },
  mapPleinEcran: { flex: 1 },
  fallback: {
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  fallbackText: {
    fontSize: fontSize.md,
    color: colors.neutral[500],
    textAlign: 'center',
  },
});
