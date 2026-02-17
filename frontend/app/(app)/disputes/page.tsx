'use client';

import React from 'react';
import { Shield, Clock, CheckCircle, AlertTriangle, MessageSquare, Scale, ArrowLeft, Phone, Mail } from 'lucide-react';
import Link from 'next/link';

/* -------------------------------------------------------------------------- */
/*  Dispute Resolution Policy Page                                            */
/* -------------------------------------------------------------------------- */

export default function DisputeResolutionPage() {
    const steps = [
        {
            icon: MessageSquare,
            title: 'Communication directe',
            description: 'Essayez d\'abord de résoudre le problème directement avec l\'autre partie via la messagerie in-app.',
            duration: 'Délai recommandé : 24h',
        },
        {
            icon: AlertTriangle,
            title: 'Signalement du litige',
            description: 'Si aucun accord n\'est trouvé, signalez le litige via votre tableau de bord. Décrivez la situation et joignez des preuves (photos, messages).',
            duration: 'Traitement : immédiat',
        },
        {
            icon: Scale,
            title: 'Médiation Transporti',
            description: 'Notre équipe de médiation examine les preuves des deux parties et propose une résolution équitable.',
            duration: 'Délai : 48-72h ouvrées',
        },
        {
            icon: CheckCircle,
            title: 'Résolution',
            description: 'Le litige est résolu avec un remboursement partiel ou total, ou un arrangement alternatif accepté par les deux parties.',
            duration: 'Exécution : sous 5 jours',
        },
    ];

    const guarantees = [
        {
            title: 'Garantie Escrow',
            description: 'Votre argent est protégé par notre système d\'entiercement. Le paiement n\'est libéré au transporteur qu\'après confirmation de la livraison.',
        },
        {
            title: 'Remboursement intégral',
            description: 'En cas de non-prestation ou de dommages significatifs non déclarés, un remboursement intégral est garanti.',
        },
        {
            title: 'Assurance dommages',
            description: 'Les dommages constatés lors du transport sont couverts jusqu\'à la valeur déclarée des biens, sous réserve de documentation photographique.',
        },
        {
            title: 'Transparence totale',
            description: 'Les deux parties ont accès à l\'historique complet des échanges et décisions. Aucune décision n\'est prise sans consultation.',
        },
    ];

    return (
        <div className="p-6 lg:p-8 max-w-3xl mx-auto">
            <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Retour au tableau de bord
            </Link>

            {/* Header */}
            <div className="text-center mb-12">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-blue-600" />
                </div>
                <h1 className="text-3xl font-bold text-neutral-900 mb-2">
                    Politique de résolution des litiges
                </h1>
                <p className="text-neutral-500 max-w-lg mx-auto">
                    Transporti s&apos;engage à protéger ses utilisateurs. Voici comment nous traitons les litiges pour garantir une expérience sûre et équitable.
                </p>
            </div>

            {/* Process Steps */}
            <div className="mb-12">
                <h2 className="text-xl font-bold text-neutral-900 mb-6">Processus de résolution</h2>
                <div className="space-y-6">
                    {steps.map((step, index) => (
                        <div key={index} className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                                    <step.icon className="w-5 h-5 text-blue-600" />
                                </div>
                                {index < steps.length - 1 && (
                                    <div className="w-0.5 h-full bg-blue-100 mt-2 min-h-[2rem]" />
                                )}
                            </div>
                            <div className="pb-6">
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="font-semibold text-neutral-900">
                                        Étape {index + 1} : {step.title}
                                    </h3>
                                </div>
                                <p className="text-sm text-neutral-600 mb-2">{step.description}</p>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                                    <Clock className="w-3 h-3" />
                                    {step.duration}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Guarantees */}
            <div className="mb-12">
                <h2 className="text-xl font-bold text-neutral-900 mb-6">Nos garanties</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {guarantees.map((g, index) => (
                        <div key={index} className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                            <h3 className="font-semibold text-emerald-900 mb-2">{g.title}</h3>
                            <p className="text-sm text-emerald-700">{g.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Contact */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-6 text-center">
                <h2 className="text-lg font-bold text-neutral-900 mb-2">Besoin d&apos;aide ?</h2>
                <p className="text-sm text-neutral-600 mb-4">
                    Notre équipe de support est disponible du lundi au samedi, de 8h à 18h.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <a href="tel:+21671000000" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-neutral-300 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
                        <Phone className="w-4 h-4" />
                        +216 71 000 000
                    </a>
                    <a href="mailto:support@transporti.tn" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-neutral-300 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
                        <Mail className="w-4 h-4" />
                        support@transporti.tn
                    </a>
                </div>
            </div>
        </div>
    );
}
