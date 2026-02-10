'use client';

import React from 'react';
import { Truck, Weight, FileCheck } from 'lucide-react';

interface Props {
    vehicleType: string;
    vehicleCapacityKg?: number;
    vehiclePhotos: string[];
    insuranceValidUntil?: string;
}

export function VehicleGallery({ vehicleType, vehicleCapacityKg, vehiclePhotos, insuranceValidUntil }: Props) {
    const isInsured = insuranceValidUntil && new Date(insuranceValidUntil) > new Date();

    return (
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100">
                <h3 className="text-lg font-semibold text-neutral-900">Véhicule</h3>
            </div>

            {/* Photos */}
            {vehiclePhotos.length > 0 ? (
                <div className="grid grid-cols-2 gap-1 p-1">
                    {vehiclePhotos.slice(0, 4).map((photo, idx) => (
                        <div key={idx} className="aspect-video bg-neutral-100 rounded-lg overflow-hidden">
                            <img src={photo} alt={`Véhicule ${idx + 1}`}
                                className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-3">
                        <Truck className="w-8 h-8 text-neutral-300" />
                    </div>
                    <p className="text-sm text-neutral-400">Aucune photo de véhicule</p>
                </div>
            )}

            {/* Vehicle Details */}
            <div className="p-6 space-y-3">
                <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-neutral-400" />
                    <div>
                        <p className="text-xs text-neutral-500">Type de véhicule</p>
                        <p className="text-sm font-medium text-neutral-900">{vehicleType || 'Non spécifié'}</p>
                    </div>
                </div>

                {vehicleCapacityKg && (
                    <div className="flex items-center gap-3">
                        <Weight className="w-5 h-5 text-neutral-400" />
                        <div>
                            <p className="text-xs text-neutral-500">Capacité de charge</p>
                            <p className="text-sm font-medium text-neutral-900">{vehicleCapacityKg} kg</p>
                        </div>
                    </div>
                )}

                {insuranceValidUntil && (
                    <div className="flex items-center gap-3">
                        <FileCheck className="w-5 h-5 text-neutral-400" />
                        <div>
                            <p className="text-xs text-neutral-500">Assurance</p>
                            <p className={`text-sm font-medium ${isInsured ? 'text-emerald-600' : 'text-red-600'}`}>
                                {isInsured ? 'Valide' : 'Expirée'} — jusqu'au{' '}
                                {new Date(insuranceValidUntil).toLocaleDateString('fr-TN', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
