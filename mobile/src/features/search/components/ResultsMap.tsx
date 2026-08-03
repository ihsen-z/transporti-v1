import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { colors, fontSize, radii, shadows, spacing } from '@/shared/theme';
import { Txt } from '@/shared/ui/Txt';
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
      >
        {corridors.map((corridor) => (
          <Fragment key={corridor.key}>
            <Polyline
              coordinates={[corridor.from, corridor.to]}
              strokeColor={colors.brand[500]}
              strokeWidth={3}
            />
            <Marker
              coordinate={corridor.from}
              title={corridor.fromLabel}
              // Le trait est une ligne droite entre chefs-lieux ; la distance
              // vient du serveur et reflète la vraie route.
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
