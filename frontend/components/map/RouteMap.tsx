'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Coordinates } from '@/lib/map';
import { getCenterPoint, calculateZoom } from '@/lib/map';
import { createPremiumMarker, createSimpleMarker, type MarkerType } from './MapMarkers';

// Fix Leaflet default icon issue with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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

// Status-based configuration
type JobStatus = 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface RouteStyle {
    color: string;
    weight: number;
    opacity: number;
    dashArray?: string;
}

interface StatusConfig {
    route: RouteStyle;
    routeShadow: RouteStyle;
    pickupMarker: MarkerType;
    pickupOpacity: number;
    deliveryMarker: MarkerType;
    deliveryOpacity: number;
    showTransportMarker: boolean;
    label: string;
    labelColor: string;
    labelBg: string;
    labelIcon: string;
}

const statusConfigs: Record<JobStatus, StatusConfig> = {
    PENDING: {
        route: { color: '#f97316', weight: 4, opacity: 0.6, dashArray: '12, 8' },
        routeShadow: { color: '#1f2937', weight: 8, opacity: 0.15 },
        pickupMarker: 'pickup',
        pickupOpacity: 0.8,
        deliveryMarker: 'delivery',
        deliveryOpacity: 0.5,
        showTransportMarker: false,
        label: 'En attente de prise en charge',
        labelColor: '#c2410c',
        labelBg: '#fff7ed',
        labelIcon: '⏳',
    },
    ACCEPTED: {
        route: { color: '#3b82f6', weight: 4, opacity: 0.8 },
        routeShadow: { color: '#1f2937', weight: 8, opacity: 0.15 },
        pickupMarker: 'pickup',
        pickupOpacity: 1,
        deliveryMarker: 'delivery',
        deliveryOpacity: 0.7,
        showTransportMarker: false,
        label: 'Transporteur assigné',
        labelColor: '#1d4ed8',
        labelBg: '#eff6ff',
        labelIcon: '✓',
    },
    IN_PROGRESS: {
        route: { color: '#10b981', weight: 5, opacity: 1 },
        routeShadow: { color: '#1f2937', weight: 10, opacity: 0.2 },
        pickupMarker: 'pickup',
        pickupOpacity: 0.7,
        deliveryMarker: 'delivery',
        deliveryOpacity: 1,
        showTransportMarker: true,
        label: 'Transport en cours',
        labelColor: '#047857',
        labelBg: '#ecfdf5',
        labelIcon: '🚚',
    },
    COMPLETED: {
        route: { color: '#86efac', weight: 4, opacity: 0.6 },
        routeShadow: { color: '#1f2937', weight: 8, opacity: 0.1 },
        pickupMarker: 'pickup',
        pickupOpacity: 0.5,
        deliveryMarker: 'delivery',
        deliveryOpacity: 1,
        showTransportMarker: false,
        label: 'Livraison terminée',
        labelColor: '#166534',
        labelBg: '#dcfce7',
        labelIcon: '✅',
    },
    CANCELLED: {
        route: { color: '#9ca3af', weight: 3, opacity: 0.4, dashArray: '6, 12' },
        routeShadow: { color: '#1f2937', weight: 6, opacity: 0.08 },
        pickupMarker: 'pickup',
        pickupOpacity: 0.4,
        deliveryMarker: 'delivery',
        deliveryOpacity: 0.4,
        showTransportMarker: false,
        label: 'Transport annulé',
        labelColor: '#6b7280',
        labelBg: '#f3f4f6',
        labelIcon: '✕',
    },
};

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
    status?: JobStatus;
    height?: string;
    showStatusLabel?: boolean;
    usePremiumMarkers?: boolean;
}

export default function RouteMap({
    pickup,
    delivery,
    route,
    status = 'PENDING',
    height = '400px',
    showStatusLabel = true,
    usePremiumMarkers = true,
}: RouteMapProps) {
    const center = getCenterPoint(pickup.coordinates, delivery.coordinates);
    const zoom = calculateZoom(pickup.coordinates, delivery.coordinates);

    const config = statusConfigs[status];

    // Create markers based on preference
    const pickupIcon = usePremiumMarkers
        ? createPremiumMarker(config.pickupMarker, { opacity: config.pickupOpacity })
        : createSimpleMarker('#f97316', config.pickupOpacity);

    const deliveryIcon = usePremiumMarkers
        ? createPremiumMarker(config.deliveryMarker, { opacity: config.deliveryOpacity })
        : createSimpleMarker('#10b981', config.deliveryOpacity);

    // Transport marker for IN_PROGRESS status (positioned mid-route)
    const transportIcon = usePremiumMarkers
        ? createPremiumMarker('transport', { animated: true })
        : createSimpleMarker('#1e40af', 1);

    // Calculate mid-point for transport marker
    const midPoint = route && route.length > 2
        ? route[Math.floor(route.length / 2)]
        : null;

    return (
        <div style={{ height, width: '100%', position: 'relative' }}>
            {/* Status Label Overlay */}
            {showStatusLabel && (
                <div
                    style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        zIndex: 1000,
                        backgroundColor: config.labelBg,
                        color: config.labelColor,
                        padding: '8px 14px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: 600,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                        border: `1px solid ${config.labelColor}20`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    <span style={{ fontSize: '16px' }}>{config.labelIcon}</span>
                    {config.label}
                </div>
            )}

            <div style={{ height: '100%', width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
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

                    {/* Route Shadow (for depth) */}
                    {route && route.length > 0 && (
                        <Polyline
                            positions={route.map(coord => [coord.lat, coord.lng])}
                            color={config.routeShadow.color}
                            weight={config.routeShadow.weight}
                            opacity={config.routeShadow.opacity}
                        />
                    )}

                    {/* Main Route Polyline */}
                    {route && route.length > 0 && (
                        <Polyline
                            positions={route.map(coord => [coord.lat, coord.lng])}
                            color={config.route.color}
                            weight={config.route.weight}
                            opacity={config.route.opacity}
                            dashArray={config.route.dashArray}
                            className={status === 'IN_PROGRESS' ? 'route-animated' : ''}
                        />
                    )}

                    {/* Pickup Marker */}
                    <Marker position={[pickup.coordinates.lat, pickup.coordinates.lng]} icon={pickupIcon}>
                        <Popup>
                            <div style={{ minWidth: '180px', padding: '4px' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginBottom: '8px',
                                    paddingBottom: '8px',
                                    borderBottom: '1px solid #e5e7eb'
                                }}>
                                    <span style={{ fontSize: '20px' }}>📦</span>
                                    <span style={{ fontWeight: 600, color: '#f97316' }}>Point de départ</span>
                                </div>
                                <p style={{ color: '#374151', margin: 0 }}>{pickup.name}</p>
                            </div>
                        </Popup>
                    </Marker>

                    {/* Delivery Marker */}
                    <Marker position={[delivery.coordinates.lat, delivery.coordinates.lng]} icon={deliveryIcon}>
                        <Popup>
                            <div style={{ minWidth: '180px', padding: '4px' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginBottom: '8px',
                                    paddingBottom: '8px',
                                    borderBottom: '1px solid #e5e7eb'
                                }}>
                                    <span style={{ fontSize: '20px' }}>🏠</span>
                                    <span style={{ fontWeight: 600, color: '#10b981' }}>Point de livraison</span>
                                </div>
                                <p style={{ color: '#374151', margin: 0 }}>{delivery.name}</p>
                            </div>
                        </Popup>
                    </Marker>

                    {/* Transport Marker (for IN_PROGRESS status) */}
                    {config.showTransportMarker && midPoint && (
                        <Marker position={[midPoint.lat, midPoint.lng]} icon={transportIcon}>
                            <Popup>
                                <div style={{ minWidth: '180px', padding: '4px' }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginBottom: '8px',
                                        paddingBottom: '8px',
                                        borderBottom: '1px solid #e5e7eb'
                                    }}>
                                        <span style={{ fontSize: '20px' }}>🚚</span>
                                        <span style={{ fontWeight: 600, color: '#1e40af' }}>Transporteur</span>
                                    </div>
                                    <p style={{ color: '#374151', margin: 0 }}>En route vers la destination</p>
                                </div>
                            </Popup>
                        </Marker>
                    )}
                </MapContainer>
            </div>
        </div>
    );
}


