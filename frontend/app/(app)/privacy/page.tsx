'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Politique de Confidentialité — Stub                                       */
/* -------------------------------------------------------------------------- */

export default function PrivacyPage() {
    return (
        <div className="p-6 lg:p-8 max-w-3xl mx-auto">
            <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Retour
            </Link>

            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-6 h-6 text-blue-600" />
                    <h1 className="text-2xl font-bold text-neutral-900">
                        Politique de Confidentialité
                    </h1>
                </div>
                <p className="text-sm text-neutral-400">Dernière mise à jour : Février 2026</p>
            </div>

            <div className="prose prose-neutral max-w-none space-y-6">
                <section>
                    <h2 className="text-lg font-semibold text-neutral-900">1. Données collectées</h2>
                    <p className="text-sm text-neutral-600 leading-relaxed">
                        Nous collectons les données nécessaires à la fourniture de nos services : nom, prénom, adresse e-mail, numéro de téléphone, et informations relatives aux transports effectués. Pour les transporteurs, nous collectons également les documents de vérification (CIN, permis, carte grise).
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-neutral-900">2. Utilisation des données</h2>
                    <p className="text-sm text-neutral-600 leading-relaxed">
                        Vos données sont utilisées exclusivement pour : la gestion de votre compte, la mise en relation avec les transporteurs/clients, le traitement des paiements, l&apos;amélioration de nos services, et la communication de notifications liées à vos transports.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-neutral-900">3. Protection des données</h2>
                    <p className="text-sm text-neutral-600 leading-relaxed">
                        Toutes les données sont chiffrées en transit (TLS) et au repos. L&apos;accès aux données personnelles est strictement limité aux membres autorisés de l&apos;équipe Transporti. Aucune donnée n&apos;est vendue ou partagée avec des tiers à des fins commerciales.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-neutral-900">4. Vos droits</h2>
                    <p className="text-sm text-neutral-600 leading-relaxed">
                        Conformément à la législation tunisienne sur la protection des données personnelles, vous disposez d&apos;un droit d&apos;accès, de rectification et de suppression de vos données. Pour exercer ces droits, contactez-nous à{' '}
                        <a href="mailto:privacy@transporti.tn" className="text-blue-600 hover:underline">privacy@transporti.tn</a>.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-neutral-900">5. Cookies</h2>
                    <p className="text-sm text-neutral-600 leading-relaxed">
                        Nous utilisons des cookies essentiels pour le fonctionnement de la plateforme (authentification, préférences). Aucun cookie de traçage publicitaire n&apos;est utilisé.
                    </p>
                </section>
            </div>
        </div>
    );
}
