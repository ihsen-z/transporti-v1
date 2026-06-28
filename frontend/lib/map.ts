// Map utilities — Tunisia city coordinates
// Production — real geographic data

export interface Coordinates {
    lat: number;
    lng: number;
}

export interface RoutePoint {
    name: string;
    coordinates: Coordinates;
}

// Tunisia major cities coordinates
export const tunisiaCoordinates: Record<string, Coordinates> = {
    'Tunis Centre': { lat: 36.8065, lng: 10.1815 },
    'Tunis Lac': { lat: 36.8372, lng: 10.2340 },
    'Tunis Ariana': { lat: 36.8625, lng: 10.1956 },
    'Tunis Aéroport': { lat: 36.8510, lng: 10.2272 },
    'Sousse Ville': { lat: 35.8256, lng: 10.6369 },
    'Sfax Centre': { lat: 34.7406, lng: 10.7603 },
    'Bizerte Port': { lat: 37.2744, lng: 9.8739 },
    'Nabeul Centre': { lat: 36.4561, lng: 10.7356 },
    'Monastir Centre': { lat: 35.7774, lng: 10.8263 },
    'Gabès Ville': { lat: 33.8815, lng: 10.0982 },
};

// Get coordinates for a location name
export function getCoordinates(locationName: string): Coordinates {
    return tunisiaCoordinates[locationName] || tunisiaCoordinates['Tunis Centre'];
}

// Calculate center point between two coordinates
export function getCenterPoint(coord1: Coordinates, coord2: Coordinates): Coordinates {
    return {
        lat: (coord1.lat + coord2.lat) / 2,
        lng: (coord1.lng + coord2.lng) / 2,
    };
}

// Calculate appropriate zoom level based on distance
export function calculateZoom(coord1: Coordinates, coord2: Coordinates): number {
    const latDiff = Math.abs(coord1.lat - coord2.lat);
    const lngDiff = Math.abs(coord1.lng - coord2.lng);
    const maxDiff = Math.max(latDiff, lngDiff);

    if (maxDiff > 3) return 7;
    if (maxDiff > 1.5) return 8;
    if (maxDiff > 0.5) return 9;
    return 10;
}
