'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Coordinates } from '@/lib/map';
import { getCenterPoint, calculateZoom } from '@/lib/map';

// Fix Leaflet default icon issue with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createCustomIcon = (color: string) => {
    return L.divIcon({
        className: 'custom-marker',
        html: `
      <div style="
        width: 32px;
        height: 32px;
        background-color: ${color};
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        <div style="
          width: 12px;
          height: 12px;
          background-color: white;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        "></div>
      </div>
    `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
    });
};

const pickupIcon = createCustomIcon('#10b981'); // accent green
const deliveryIcon = createCustomIcon('#f97316'); // cta orange

interface MapViewUpdaterProps {
    center: Coordinates;
    zoom: number;
}

function MapViewUpdater({ center, zoom }: MapViewUpdaterProps) {
    const map = useMap();

    useEffect(() => {
        map.setView([center.lat, center.lng], zoom);
    }, [center, zoom, map]);

    return null;
}

interface RouteMapProps {
    pickup: {
        name: string;
        coordinates: Coordinates;
    };
    delivery: {
        name: string;
        coordinates: Coordinates;
    };
    route?: Coordinates[];
    status?: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    height?: string;
}

export default function RouteMap({
    pickup,
    delivery,
    route,
    status = 'PENDING',
    height = '400px',
}: RouteMapProps) {
    const center = getCenterPoint(pickup.coordinates, delivery.coordinates);
    const zoom = calculateZoom(pickup.coordinates, delivery.coordinates);

    const routeColor = {
        PENDING: '#f97316',
        ACCEPTED: '#3b82f6',
        IN_PROGRESS: '#10b981',
        COMPLETED: '#22c55e',
        CANCELLED: '#6b7280',
    }[status];

    return (
        <div style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
            <MapContainer
                center={[center.lat, center.lng]}
                zoom={zoom}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapViewUpdater center={center} zoom={zoom} />

                {/* Pickup Marker */}
                <Marker position={[pickup.coordinates.lat, pickup.coordinates.lng]} icon={pickupIcon}>
                    <Popup>
                        <div className="text-sm">
                            <p className="font-semibold text-accent-700">📦 Point de départ</p>
                            <p className="text-neutral-700">{pickup.name}</p>
                        </div>
                    </Popup>
                </Marker>

                {/* Delivery Marker */}
                <Marker position={[delivery.coordinates.lat, delivery.coordinates.lng]} icon={deliveryIcon}>
                    <Popup>
                        <div className="text-sm">
                            <p className="font-semibold text-cta-700">📍 Point de livraison</p>
                            <p className="text-neutral-700">{delivery.name}</p>
                        </div>
                    </Popup>
                </Marker>

                {/* Route Polyline */}
                {route && route.length > 0 && (
                    <Polyline
                        positions={route.map(coord => [coord.lat, coord.lng])}
                        color={routeColor}
                        weight={4}
                        opacity={0.7}
                    />
                )}
            </MapContainer>
        </div>
    );
}
