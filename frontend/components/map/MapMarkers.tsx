'use client';

import L from 'leaflet';

// ============================================================================
// TRANSPORTI V1 - PREMIUM MAP MARKERS
// Inspired by modern logistics iconography with brand-aligned colors
// ============================================================================

// Brand Colors from Transporti V1 Design System
const COLORS = {
    primary: '#1e40af',      // Deep blue
    primaryLight: '#3b82f6', // Light blue
    accent: '#10b981',       // Success green
    accentLight: '#22c55e',  // Light green
    cta: '#f97316',          // Orange
    ctaLight: '#fb923c',     // Light orange
    warning: '#ef4444',      // Red
    neutral: '#6b7280',      // Gray
    info: '#0d9488',         // Teal
    fragile: '#ec4899',      // Pink
    heavy: '#92400e',        // Brown
    white: '#ffffff',
};

// ============================================================================
// SVG ICON DEFINITIONS
// Premium flat icons matching the logistics theme
// ============================================================================

const ICONS = {
    // Pickup: Hand holding box
    pickup: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 8v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8"/>
            <path d="M23 5H1v3h22V5z"/>
            <path d="M10 12h4"/>
        </svg>
    `,
    // Delivery: Home with checkmark
    delivery: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
    `,
    // Locker: Grid of boxes
    locker: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
        </svg>
    `,
    // Fragile: Wine glass
    fragile: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 22h8"/>
            <path d="M12 11v11"/>
            <path d="M5.5 8C5.5 9.38 6.12 10.5 7 11.5s2.12 2.08 3.5 2.5c-.67.5-1.5 1-2 1.5H8c-1.5-1-3-2.5-3-5.5"/>
            <path d="M12 2C9.24 2 7 4.24 7 7c0 1.5.5 2.5 1 3.5.5 1 1.5 2 2 2.5h4c.5-.5 1.5-1.5 2-2.5.5-1 1-2 1-3.5 0-2.76-2.24-5-5-5z"/>
        </svg>
    `,
    // Heavy: Weight/Dumbbell
    heavy: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6.5 6.5L17.5 17.5"/>
            <path d="M3 10v4h4v-4H3z"/>
            <path d="M17 10v4h4v-4h-4z"/>
            <path d="M7 12h10"/>
        </svg>
    `,
    // Warning: Triangle with exclamation
    warning: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
    `,
    // Transport: Truck in motion
    transport: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="3" width="15" height="13"/>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
            <circle cx="5.5" cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
    `,
    // Attempted: Clock with arrow
    attempted: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
            <path d="M21 12a9 9 0 0 0-9-9"/>
        </svg>
    `,
};

// ============================================================================
// MARKER TYPE DEFINITIONS
// ============================================================================

export type MarkerType =
    | 'pickup'
    | 'delivery'
    | 'locker'
    | 'fragile'
    | 'heavy'
    | 'warning'
    | 'transport'
    | 'attempted';

interface MarkerConfig {
    color: string;
    shape: 'pin' | 'circle' | 'hexagon' | 'diamond' | 'square';
    icon: string;
    label?: string;
}

const MARKER_CONFIGS: Record<MarkerType, MarkerConfig> = {
    pickup: {
        color: COLORS.cta,
        shape: 'pin',
        icon: ICONS.pickup,
        label: 'PICKUP',
    },
    delivery: {
        color: COLORS.accent,
        shape: 'pin',
        icon: ICONS.delivery,
        label: 'DELIVERY',
    },
    locker: {
        color: COLORS.primaryLight,
        shape: 'square',
        icon: ICONS.locker,
        label: 'LOCKER',
    },
    fragile: {
        color: COLORS.fragile,
        shape: 'pin',
        icon: ICONS.fragile,
        label: 'FRAGILE',
    },
    heavy: {
        color: COLORS.heavy,
        shape: 'hexagon',
        icon: ICONS.heavy,
        label: 'HEAVY',
    },
    warning: {
        color: COLORS.warning,
        shape: 'diamond',
        icon: ICONS.warning,
        label: 'ALERT',
    },
    transport: {
        color: COLORS.primary,
        shape: 'circle',
        icon: ICONS.transport,
        label: '',
    },
    attempted: {
        color: COLORS.info,
        shape: 'pin',
        icon: ICONS.attempted,
        label: 'ATTEMPTED',
    },
};

// ============================================================================
// SVG SHAPE GENERATORS
// ============================================================================

function generatePinShape(color: string, icon: string, label?: string): string {
    return `
        <div class="transporti-marker transporti-marker-pin" style="
            position: relative;
            width: 44px;
            height: 56px;
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.25));
        ">
            <svg width="44" height="56" viewBox="0 0 44 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Pin Shape -->
                <path d="M22 0C9.85 0 0 9.85 0 22c0 16.5 22 34 22 34s22-17.5 22-34C44 9.85 34.15 0 22 0z" fill="${color}"/>
                <!-- White Border -->
                <path d="M22 2C10.95 2 2 10.95 2 22c0 15.12 20 31.5 20 31.5s20-16.38 20-31.5C42 10.95 33.05 2 22 2z" fill="${color}" stroke="white" stroke-width="3"/>
                <!-- Inner Circle Background -->
                <circle cx="22" cy="20" r="14" fill="white" fill-opacity="0.95"/>
            </svg>
            <!-- Icon -->
            <div style="
                position: absolute;
                top: 8px;
                left: 50%;
                transform: translateX(-50%);
                width: 22px;
                height: 22px;
                color: ${color};
            ">
                ${icon}
            </div>
            ${label ? `
            <div style="
                position: absolute;
                bottom: 12px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 7px;
                font-weight: 700;
                color: white;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                white-space: nowrap;
            ">${label}</div>
            ` : ''}
        </div>
    `;
}

function generateCircleShape(color: string, icon: string): string {
    return `
        <div class="transporti-marker transporti-marker-circle" style="
            position: relative;
            width: 48px;
            height: 48px;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
        ">
            <!-- Outer Circle -->
            <div style="
                width: 48px;
                height: 48px;
                background: ${color};
                border-radius: 50%;
                border: 3px solid white;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <!-- Icon -->
                <div style="
                    width: 26px;
                    height: 26px;
                    color: white;
                ">
                    ${icon}
                </div>
            </div>
            <!-- Pulse Animation Ring (for active transport) -->
            <div class="marker-pulse" style="
                position: absolute;
                top: -4px;
                left: -4px;
                width: 56px;
                height: 56px;
                border-radius: 50%;
                border: 2px solid ${color};
                opacity: 0;
                animation: markerPulse 2s infinite;
            "></div>
        </div>
    `;
}

function generateHexagonShape(color: string, icon: string, label?: string): string {
    return `
        <div class="transporti-marker transporti-marker-hexagon" style="
            position: relative;
            width: 48px;
            height: 52px;
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.25));
        ">
            <svg width="48" height="52" viewBox="0 0 48 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 0L46 13v26L24 52 2 39V13L24 0z" fill="${color}" stroke="white" stroke-width="3"/>
                <path d="M24 8L38 16v20l-14 8-14-8V16l14-8z" fill="white" fill-opacity="0.95"/>
            </svg>
            <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 22px;
                height: 22px;
                color: ${color};
            ">
                ${icon}
            </div>
        </div>
    `;
}

function generateDiamondShape(color: string, icon: string): string {
    return `
        <div class="transporti-marker transporti-marker-diamond" style="
            position: relative;
            width: 44px;
            height: 44px;
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.25));
        ">
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="22" y="2" width="28" height="28" rx="4" transform="rotate(45 22 2)" fill="${color}" stroke="white" stroke-width="3"/>
                <rect x="22" y="10" width="18" height="18" rx="2" transform="rotate(45 22 10)" fill="white" fill-opacity="0.95"/>
            </svg>
            <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 18px;
                height: 18px;
                color: ${color};
            ">
                ${icon}
            </div>
        </div>
    `;
}

function generateSquareShape(color: string, icon: string, label?: string): string {
    return `
        <div class="transporti-marker transporti-marker-square" style="
            position: relative;
            width: 44px;
            height: 50px;
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.25));
        ">
            <svg width="44" height="50" viewBox="0 0 44 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="40" height="36" rx="8" fill="${color}" stroke="white" stroke-width="3"/>
                <rect x="8" y="8" width="28" height="24" rx="4" fill="white" fill-opacity="0.95"/>
                <!-- Pointer -->
                <path d="M17 38l5 10 5-10H17z" fill="${color}"/>
            </svg>
            <div style="
                position: absolute;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                width: 22px;
                height: 22px;
                color: ${color};
            ">
                ${icon}
            </div>
            ${label ? `
            <div style="
                position: absolute;
                bottom: 14px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 6px;
                font-weight: 700;
                color: white;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            ">${label}</div>
            ` : ''}
        </div>
    `;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Creates a premium Leaflet marker icon for the specified type
 */
export function createPremiumMarker(
    type: MarkerType,
    options?: { opacity?: number; animated?: boolean }
): L.DivIcon {
    const config = MARKER_CONFIGS[type];
    const opacity = options?.opacity ?? 1;

    let html: string;
    let iconSize: [number, number];
    let iconAnchor: [number, number];
    let popupAnchor: [number, number];

    switch (config.shape) {
        case 'circle':
            html = generateCircleShape(config.color, config.icon);
            iconSize = [48, 48];
            iconAnchor = [24, 24];
            popupAnchor = [0, -24];
            break;
        case 'hexagon':
            html = generateHexagonShape(config.color, config.icon, config.label);
            iconSize = [48, 52];
            iconAnchor = [24, 26];
            popupAnchor = [0, -26];
            break;
        case 'diamond':
            html = generateDiamondShape(config.color, config.icon);
            iconSize = [44, 44];
            iconAnchor = [22, 22];
            popupAnchor = [0, -22];
            break;
        case 'square':
            html = generateSquareShape(config.color, config.icon, config.label);
            iconSize = [44, 50];
            iconAnchor = [22, 50];
            popupAnchor = [0, -50];
            break;
        case 'pin':
        default:
            html = generatePinShape(config.color, config.icon, config.label);
            iconSize = [44, 56];
            iconAnchor = [22, 56];
            popupAnchor = [0, -56];
            break;
    }

    // Apply opacity wrapper
    const wrappedHtml = `<div style="opacity: ${opacity}">${html}</div>`;

    return L.divIcon({
        className: `transporti-premium-marker transporti-marker-${type}`,
        html: wrappedHtml,
        iconSize,
        iconAnchor,
        popupAnchor,
    });
}

/**
 * Creates a simple colored marker (for fallback/legacy compatibility)
 */
export function createSimpleMarker(color: string, opacity: number = 1): L.DivIcon {
    return L.divIcon({
        className: 'transporti-simple-marker',
        html: `
            <div style="
                width: 32px;
                height: 32px;
                background-color: ${color};
                border: 3px solid white;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                opacity: ${opacity};
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
}

/**
 * Get marker color by type
 */
export function getMarkerColor(type: MarkerType): string {
    return MARKER_CONFIGS[type].color;
}

export { COLORS as MarkerColors };
