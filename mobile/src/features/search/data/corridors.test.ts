import { buildCorridors, regionFor, TUNISIA_REGION } from './corridors';
import type { TripResultDto } from '../api/dto';

function trip(overrides: Partial<TripResultDto> = {}): TripResultDto {
  return {
    id: 1,
    job_type: 'RETURN',
    pickup_governorate: 'Sousse',
    dropoff_governorate: 'Sfax',
    pickup_address: 'Centre',
    dropoff_address: 'Centre',
    scheduled_time: '2026-09-05T09:00:00Z',
    owner_name: 'Mehdi',
    price_tnd_min: '80',
    price_tnd_max: '120',
    instant_booking: false,
    available_capacity: '3',
    distance_km: '127.4',
    ...overrides,
  };
}

// Une recherche filtre sur UN couple depart/arrivee : sans regroupement, dix
// resultats empileraient dix traits identiques au meme endroit.
describe('buildCorridors', () => {
  it('regroupe les trajets partageant le meme corridor', () => {
    const corridors = buildCorridors(
      [trip({ id: 1 }), trip({ id: 2 }), trip({ id: 3 })],
      false,
    );

    expect(corridors).toHaveLength(1);
    expect(corridors[0]?.key).toBe('Sousse|Sfax');
  });

  it('distingue deux corridors differents', () => {
    const corridors = buildCorridors(
      [
        trip({ id: 1 }),
        trip({ id: 2, pickup_governorate: 'Tunis', dropoff_governorate: 'Bizerte' }),
      ],
      false,
    );

    expect(corridors.map((c) => c.key)).toEqual(['Sousse|Sfax', 'Tunis|Bizerte']);
  });

  it('place les points sur les chefs-lieux', () => {
    const corridor = buildCorridors([trip()], false)[0];

    // Sousse et Sfax, cf. GOVERNORATES.
    expect(corridor?.from).toEqual({ latitude: 35.8254, longitude: 10.636 });
    expect(corridor?.to).toEqual({ latitude: 34.7406, longitude: 10.7603 });
  });

  it('ignore un gouvernorat absent du referentiel plutot que de tracer un trait faux', () => {
    const corridors = buildCorridors([trip({ dropoff_governorate: 'Atlantide' })], false);

    expect(corridors).toHaveLength(0);
  });

  it('libelle selon la langue', () => {
    expect(buildCorridors([trip()], false)[0]?.fromLabel).toBe('Sousse');
    expect(buildCorridors([trip()], true)[0]?.fromLabel).toBe('سوسة');
  });

  describe('distance', () => {
    it('convertit la chaine du serveur en nombre', () => {
      expect(buildCorridors([trip()], false)[0]?.distanceKm).toBeCloseTo(127.4);
    });

    it('rend null quand le serveur n en fournit pas', () => {
      expect(buildCorridors([trip({ distance_km: null })], false)[0]?.distanceKm).toBeNull();
    });

    it('rend null sur une valeur illisible plutot qu un NaN affiche', () => {
      expect(buildCorridors([trip({ distance_km: 'n/a' })], false)[0]?.distanceKm).toBeNull();
    });

    it('recupere la premiere distance renseignee du corridor', () => {
      const corridors = buildCorridors(
        [trip({ id: 1, distance_km: null }), trip({ id: 2, distance_km: '130' })],
        false,
      );

      expect(corridors[0]?.distanceKm).toBe(130);
    });
  });
});

describe('regionFor', () => {
  it('retombe sur la Tunisie entiere sans corridor', () => {
    expect(regionFor([])).toEqual(TUNISIA_REGION);
  });

  it('centre le cadre entre depart et arrivee', () => {
    const region = regionFor(buildCorridors([trip()], false));

    expect(region.latitude).toBeCloseTo((35.8254 + 34.7406) / 2);
    expect(region.longitude).toBeCloseTo((10.636 + 10.7603) / 2);
  });

  it('impose un zoom minimum sur un corridor tres court', () => {
    const region = regionFor(
      buildCorridors([trip({ pickup_governorate: 'Tunis', dropoff_governorate: 'Ariana' })], false),
    );

    // Tunis et Ariana sont quasi confondus : sans plancher, la carte zoomerait
    // au ras du sol.
    expect(region.latitudeDelta).toBeGreaterThanOrEqual(0.5);
    expect(region.longitudeDelta).toBeGreaterThanOrEqual(0.5);
  });
});
