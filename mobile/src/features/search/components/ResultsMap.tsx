import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { colors, fontSize, radii, shadows, spacing } from '@/shared/theme';
import { Txt } from '@/shared/ui/Txt';
import { findGovernorate } from '@/features/trips/data/governorates';
import type { TripResultDto } from '../api/dto';

// Carte des retours trouvés : un trait départ -> arrivée par trajet.
// Le backend ne renvoie pas de géométrie, seulement des noms de gouvernorats :
// les coordonnées viennent des chefs-lieux déjà présents dans GOVERNORATES.
// C'est donc une vue indicative du corridor, pas un itinéraire routier.

interface LatLng {
  latitude: number;
  longitude: number;
}

interface Leg {
  id: number;
  from: LatLng;
  to: LatLng;
  fromLabel: string;
  toLabel: string;
  ownerName: string;
}

// Repli quand aucune coordonnée n'est exploitable : la Tunisie entière.
const TUNISIA_REGION: Region = {
  latitude: 34.5,
  longitude: 9.5,
  latitudeDelta: 6,
  longitudeDelta: 6,
};

// Marge autour des points pour que les marqueurs ne collent pas au bord.
const REGION_PADDING = 1.4;
const MIN_DELTA = 0.5;

// Le plugin Expo n'écrit la balise geo.API_KEY dans l'AndroidManifest que si la
// clé est renseignée ; monter un MapView Google sans elle casse l'écran. On
// affiche donc un repli explicite plutôt qu'une recherche inutilisable.
//
// Le drapeau vient de `extra`, pose par app.config.js, et NON de
// `android.config.googleMaps` : ce dernier est elague de la config publique
// servie a l'app, donc toujours vide cote JS. Renseigner la cle exige un
// rebuild natif : ce test n'a pas besoin d'etre reactif.
// `extra` est typé librement par expo-constants, d'où la comparaison stricte.
const hasMapsKey = Constants.expoConfig?.extra?.hasGoogleMapsKey === true;

function buildLegs(trips: readonly TripResultDto[], arabic: boolean): Leg[] {
  const legs: Leg[] = [];
  for (const trip of trips) {
    const from = findGovernorate(trip.pickup_governorate);
    const to = findGovernorate(trip.dropoff_governorate);
    // Un gouvernorat inconnu du référentiel est ignoré plutôt que placé au
    // large : mieux vaut un trajet absent de la carte qu'un trait faux.
    if (from === undefined || to === undefined) continue;
    legs.push({
      id: trip.id,
      from: { latitude: from.lat, longitude: from.lng },
      to: { latitude: to.lat, longitude: to.lng },
      fromLabel: arabic ? from.nameAr : from.nameFr,
      toLabel: arabic ? to.nameAr : to.nameFr,
      ownerName: trip.owner_name,
    });
  }
  return legs;
}

/** Cadre englobant tous les points, centré. */
function regionFor(legs: readonly Leg[]): Region {
  const points = legs.flatMap((leg) => [leg.from, leg.to]);
  const first = points[0];
  if (first === undefined) return TUNISIA_REGION;

  let minLat = first.latitude;
  let maxLat = first.latitude;
  let minLng = first.longitude;
  let maxLng = first.longitude;
  for (const point of points) {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
  }

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * REGION_PADDING, MIN_DELTA),
    longitudeDelta: Math.max((maxLng - minLng) * REGION_PADDING, MIN_DELTA),
  };
}

interface Props {
  trips: readonly TripResultDto[];
}

export function ResultsMap({ trips }: Props) {
  const { t, i18n } = useTranslation();
  const legs = useMemo(() => buildLegs(trips, i18n.language === 'ar'), [trips, i18n.language]);
  const region = useMemo(() => regionFor(legs), [legs]);
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

  if (legs.length === 0) return null;

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
        {legs.map((leg) => (
          <Fragment key={leg.id}>
            <Polyline
              coordinates={[leg.from, leg.to]}
              strokeColor={colors.brand[500]}
              strokeWidth={3}
            />
            <Marker coordinate={leg.from} title={leg.fromLabel} description={leg.ownerName} />
            <Marker coordinate={leg.to} title={leg.toLabel} pinColor={colors.green[600]} />
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
