import { decodePolyline } from './polyline';

describe('decodePolyline', () => {
  it('decode le vecteur de reference de la specification Google', () => {
    // Exemple canonique de la doc du format : trois points connus.
    const points = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');

    expect(points).toHaveLength(3);
    expect(points[0]?.latitude).toBeCloseTo(38.5, 5);
    expect(points[0]?.longitude).toBeCloseTo(-120.2, 5);
    expect(points[1]?.latitude).toBeCloseTo(40.7, 5);
    expect(points[1]?.longitude).toBeCloseTo(-120.95, 5);
    expect(points[2]?.latitude).toBeCloseTo(43.252, 5);
    expect(points[2]?.longitude).toBeCloseTo(-126.453, 5);
  });

  it('rend un tableau vide sur une chaine vide', () => {
    expect(decodePolyline('')).toEqual([]);
  });

  // Une carte sans trace vaut mieux qu'un trace aberrant au milieu de l ocean.
  it('rend les points surs quand la chaine est tronquee', () => {
    const complet = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    // Coupe au milieu de la troisieme coordonnee.
    const tronque = decodePolyline('_p~iF~ps|U_ulLnnqC_mqN');

    expect(tronque).toHaveLength(2);
    expect(tronque[0]).toEqual(complet[0]);
    expect(tronque[1]).toEqual(complet[1]);
  });

  it('gere les deltas negatifs (complement a un sur le bit 0)', () => {
    const points = decodePolyline('_p~iF~ps|U');

    // Longitude negative : c'est le cas qui casse si le signe est mal decode.
    expect(points[0]?.longitude).toBeLessThan(0);
  });
});
