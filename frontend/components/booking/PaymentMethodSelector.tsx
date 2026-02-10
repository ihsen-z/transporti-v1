'use client';

import React from 'react';
import { CreditCard, Banknote, ShieldCheck, AlertTriangle } from 'lucide-react';

interface Props {
    selected: 'DIGITAL' | 'COD';
    onSelect: (method: 'DIGITAL' | 'COD') => void;
    totalPrice: number;
    codThreshold?: number; // Default 300 TND
}

export function PaymentMethodSelector({ selected, onSelect, totalPrice, codThreshold = 300 }: Props) {
    const codBlocked = totalPrice > codThreshold;

    return (
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50">
                <h3 className="text-lg font-semibold text-neutral-900">Mode de paiement</h3>
            </div>

            <div className="p-6 space-y-4">
                {/* Digital Payment */}
                <button
                    onClick={() => onSelect('DIGITAL')}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200
                        ${selected === 'DIGITAL'
                            ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                            : 'border-neutral-200 hover:border-neutral-300 bg-white'
                        }`}
                >
                    <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${selected === 'DIGITAL' ? 'bg-blue-100 text-blue-600' : 'bg-neutral-100 text-neutral-500'
                            }`}>
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <p className="font-semibold text-neutral-900">Paiement Digital</p>
                                <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                                    Recommandé
                                </span>
                            </div>
                            <p className="text-sm text-neutral-500 mt-1">
                                Paiement sécurisé par escrow. Les fonds sont protégés jusqu'à la livraison.
                            </p>
                            <div className="flex items-center gap-1.5 mt-2">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-xs text-emerald-600 font-medium">Protection acheteur incluse</span>
                            </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1
                            ${selected === 'DIGITAL' ? 'border-blue-500' : 'border-neutral-300'}`}>
                            {selected === 'DIGITAL' && <div className="w-3 h-3 rounded-full bg-blue-500" />}
                        </div>
                    </div>
                </button>

                {/* Cash on Delivery */}
                <button
                    onClick={() => !codBlocked && onSelect('COD')}
                    disabled={codBlocked}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200
                        ${codBlocked
                            ? 'border-neutral-100 bg-neutral-50 opacity-60 cursor-not-allowed'
                            : selected === 'COD'
                                ? 'border-amber-500 bg-amber-50/50 shadow-sm'
                                : 'border-neutral-200 hover:border-neutral-300 bg-white'
                        }`}
                >
                    <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${codBlocked
                                ? 'bg-neutral-100 text-neutral-400'
                                : selected === 'COD'
                                    ? 'bg-amber-100 text-amber-600'
                                    : 'bg-neutral-100 text-neutral-500'
                            }`}>
                            <Banknote className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-neutral-900">Paiement à la livraison</p>
                            <p className="text-sm text-neutral-500 mt-1">
                                Payez en espèces directement au transporteur après la livraison.
                            </p>
                            {codBlocked && (
                                <div className="flex items-center gap-1.5 mt-2">
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                                    <span className="text-xs text-red-600 font-medium">
                                        Indisponible au-delà de {codThreshold} TND (paiement digital obligatoire)
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1
                            ${selected === 'COD' && !codBlocked ? 'border-amber-500' : 'border-neutral-300'}`}>
                            {selected === 'COD' && !codBlocked && <div className="w-3 h-3 rounded-full bg-amber-500" />}
                        </div>
                    </div>
                </button>

                {/* Security Info */}
                <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-blue-900">Paiement 100% sécurisé</p>
                        <p className="text-xs text-blue-700 mt-0.5">
                            Vos informations de paiement sont protégées par un cryptage de bout en bout.
                            En cas de litige, notre équipe est disponible 24/7.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
