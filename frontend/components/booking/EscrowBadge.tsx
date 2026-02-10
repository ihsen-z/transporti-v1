'use client';

import React from 'react';
import { ShieldCheck, Lock, Clock } from 'lucide-react';

interface Props {
    paymentMethod: 'DIGITAL' | 'COD';
    totalPrice: number;
}

export function EscrowBadge({ paymentMethod, totalPrice }: Props) {
    if (paymentMethod !== 'DIGITAL') return null;

    return (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                    <p className="font-semibold text-emerald-900">Protection Escrow active</p>
                    <p className="text-xs text-emerald-700">{totalPrice.toFixed(2)} TND seront sécurisés</p>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs text-emerald-800">Les fonds sont bloqués jusqu'à confirmation de livraison</span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs text-emerald-800">Libération automatique après 48h sans litige</span>
                </div>
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs text-emerald-800">Remboursement garanti en cas de non-livraison</span>
                </div>
            </div>
        </div>
    );
}
