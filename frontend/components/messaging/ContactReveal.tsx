import React from 'react';
import { Phone, Mail, Lock, ShieldCheck } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  ContactReveal — Shows contact info only after booking is confirmed        */
/* -------------------------------------------------------------------------- */

interface ContactRevealProps {
    isBookingConfirmed: boolean;
    phone?: string;
    email?: string;
    name?: string;
}

export function ContactReveal({ isBookingConfirmed, phone, email, name }: ContactRevealProps) {
    if (!isBookingConfirmed) {
        return (
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex items-center gap-3">
                <Lock className="w-5 h-5 text-neutral-400 flex-shrink-0" />
                <div>
                    <p className="text-sm font-medium text-neutral-600">
                        Coordonnées protégées
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                        Les informations de contact seront débloquées après confirmation de la réservation.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <p className="text-sm font-semibold text-emerald-800">
                    Coordonnées de {name || 'votre contact'}
                </p>
            </div>

            {phone && (
                <a
                    href={`tel:${phone}`}
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-emerald-200 hover:bg-emerald-50 transition-colors"
                >
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-neutral-800">{phone}</span>
                </a>
            )}

            {email && (
                <a
                    href={`mailto:${email}`}
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-emerald-200 hover:bg-emerald-50 transition-colors"
                >
                    <Mail className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-neutral-800">{email}</span>
                </a>
            )}
        </div>
    );
}
