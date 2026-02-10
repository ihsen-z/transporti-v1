'use client';

// Data Source Badge — shows API vs Simulation mode
// Sprint 7.5 — API Transition Layer

import type { DataSource } from '@/lib/services/jobs';

interface DataSourceBadgeProps {
    source: DataSource;
}

export default function DataSourceBadge({ source }: DataSourceBadgeProps) {
    const isApi = source === 'api';

    return (
        <div className="fixed bottom-4 left-4 z-40">
            <div
                className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
                    shadow-sm border backdrop-blur-sm transition-all
                    ${isApi
                        ? 'bg-green-50/90 text-green-700 border-green-200'
                        : 'bg-amber-50/90 text-amber-700 border-amber-200'
                    }
                `}
            >
                <span className={`w-2 h-2 rounded-full ${isApi ? 'bg-green-500' : 'bg-amber-500'}`} />
                {isApi ? 'Connecté' : 'Mode Simulation'}
            </div>
        </div>
    );
}
