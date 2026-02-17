'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Phone, Mail, Scale, Truck } from 'lucide-react';

export default function TrustFooter() {
    return (
        <footer className="bg-white border-t border-neutral-100 mt-auto">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Trust Badges Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50">
                        <ShieldCheck className="w-8 h-8 text-emerald-600 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-emerald-900">Paiement Sécurisé</p>
                            <p className="text-xs text-emerald-700">Protection escrow incluse</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50">
                        <Scale className="w-8 h-8 text-blue-600 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-blue-900">Résolution de litiges</p>
                            <p className="text-xs text-blue-700">Modération sous 24h</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50">
                        <ShieldCheck className="w-8 h-8 text-purple-600 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-purple-900">Transporteurs vérifiés</p>
                            <p className="text-xs text-purple-700">Identité et véhicule</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50">
                        <Truck className="w-8 h-8 text-amber-600 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-amber-900">100% Tunisien</p>
                            <p className="text-xs text-amber-700">Service local de confiance</p>
                        </div>
                    </div>
                </div>

                {/* Links + Contact */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-t border-neutral-100">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Truck className="w-5 h-5 text-blue-600" />
                            <span className="font-bold text-neutral-900">Transporti</span>
                        </div>
                        <p className="text-sm text-neutral-500 leading-relaxed">
                            La plateforme de transport et déménagement en Tunisie.
                            Connectez-vous avec des transporteurs vérifiés.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-neutral-900 mb-3">Liens utiles</h4>
                        <ul className="space-y-2">
                            <li><Link href="/help" className="text-sm text-neutral-500 hover:text-blue-600 transition-colors">Centre d&apos;aide</Link></li>
                            <li><Link href="/terms" className="text-sm text-neutral-500 hover:text-blue-600 transition-colors">Conditions générales</Link></li>
                            <li><Link href="/privacy" className="text-sm text-neutral-500 hover:text-blue-600 transition-colors">Politique de confidentialité</Link></li>
                            <li><Link href="/disputes" className="text-sm text-neutral-500 hover:text-blue-600 transition-colors">Processus de résolution de litiges</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-neutral-900 mb-3">Nous contacter</h4>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-neutral-500">
                                <Mail className="w-4 h-4" />
                                <a href="mailto:support@transporti.tn" className="hover:text-blue-600 transition-colors">
                                    support@transporti.tn
                                </a>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-neutral-500">
                                <Phone className="w-4 h-4" />
                                <a href="tel:+21671000000" className="hover:text-blue-600 transition-colors">
                                    +216 71 000 000
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <div className="pt-4 border-t border-neutral-100 text-center">
                    <p className="text-xs text-neutral-400">
                        © {new Date().getFullYear()} Transporti. Tous droits réservés.
                    </p>
                </div>
            </div>
        </footer>
    );
}
