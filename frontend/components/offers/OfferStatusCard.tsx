import React from 'react';
import Link from 'next/link';
import { Clock, CheckCircle, XCircle, AlertCircle, Eye, Undo2, MapPin, Calendar } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  OfferStatusCard — Rich card for transporter's offer tracking              */
/* -------------------------------------------------------------------------- */

interface OfferStatusCardProps {
    offer: {
        id: number;
        job_id: number;
        job_pickup: string;
        job_dropoff: string;
        job_type: 'TRANSPORT' | 'MOVING';
        job_date: string;
        price: number;
        commission_rate: number;
        status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'WITHDRAWN';
        valid_until: string;
        message?: string;
        client_name?: string;
    };
    onWithdraw?: (offerId: number) => void;
}

const STATUS_CONFIG = {
    PENDING: {
        label: 'En attente',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: Clock,
    },
    ACCEPTED: {
        label: 'Acceptée',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: CheckCircle,
    },
    REJECTED: {
        label: 'Refusée',
        color: 'bg-red-50 text-red-700 border-red-200',
        icon: XCircle,
    },
    EXPIRED: {
        label: 'Expirée',
        color: 'bg-neutral-100 text-neutral-500 border-neutral-200',
        icon: AlertCircle,
    },
    WITHDRAWN: {
        label: 'Retirée',
        color: 'bg-neutral-100 text-neutral-500 border-neutral-200',
        icon: Undo2,
    },
};

export function OfferStatusCard({ offer, onWithdraw }: OfferStatusCardProps) {
    const config = STATUS_CONFIG[offer.status];
    const StatusIcon = config.icon;
    const netEarning = offer.price * (1 - offer.commission_rate);

    // Countdown for pending offers
    const deadline = new Date(offer.valid_until);
    const now = new Date();
    const hoursLeft = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60)));
    const isUrgent = hoursLeft < 6 && offer.status === 'PENDING';

    return (
        <div className={`bg-white rounded-xl border ${offer.status === 'ACCEPTED' ? 'border-emerald-200' : 'border-neutral-200'
            } p-5 hover:shadow-sm transition-shadow`}>
            {/* Header: Route + Status */}
            <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm text-neutral-600 mb-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <span className="truncate">{offer.job_pickup}</span>
                        <span className="text-neutral-400">→</span>
                        <span className="truncate">{offer.job_dropoff}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-neutral-400">
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(offer.job_date).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${offer.job_type === 'MOVING' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                            {offer.job_type === 'MOVING' ? 'Déménagement' : 'Transport'}
                        </span>
                    </div>
                </div>

                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {config.label}
                </span>
            </div>

            {/* Price breakdown */}
            <div className="bg-neutral-50 rounded-lg p-3 grid grid-cols-3 gap-3 text-center mb-3">
                <div>
                    <p className="text-xs text-neutral-400">Prix proposé</p>
                    <p className="text-sm font-semibold text-neutral-900">{offer.price.toFixed(0)} TND</p>
                </div>
                <div>
                    <p className="text-xs text-neutral-400">Commission ({(offer.commission_rate * 100).toFixed(0)}%)</p>
                    <p className="text-sm font-medium text-red-500">-{(offer.price * offer.commission_rate).toFixed(0)} TND</p>
                </div>
                <div>
                    <p className="text-xs text-neutral-400">Gain net</p>
                    <p className="text-sm font-bold text-emerald-600">{netEarning.toFixed(0)} TND</p>
                </div>
            </div>

            {/* Countdown / Actions */}
            <div className="flex items-center justify-between">
                {offer.status === 'PENDING' && (
                    <p className={`text-xs flex items-center gap-1 ${isUrgent ? 'text-red-500 font-medium' : 'text-neutral-400'}`}>
                        <Clock className="w-3.5 h-3.5" />
                        {hoursLeft > 0 ? `Expire dans ${hoursLeft}h` : 'Expiration imminente'}
                    </p>
                )}
                {offer.status !== 'PENDING' && <div />}

                <div className="flex gap-2">
                    <Link
                        href={`/jobs/${offer.job_id}`}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                    >
                        <Eye className="w-3.5 h-3.5" />
                        Voir le job
                    </Link>
                    {offer.status === 'PENDING' && onWithdraw && (
                        <button
                            onClick={() => onWithdraw(offer.id)}
                            className="text-xs font-medium text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
                        >
                            <Undo2 className="w-3.5 h-3.5" />
                            Retirer
                        </button>
                    )}
                    {offer.status === 'ACCEPTED' && (
                        <Link
                            href={`/messages/${offer.job_id}`}
                            className="text-xs font-medium text-emerald-600 hover:text-emerald-800 flex items-center gap-1 transition-colors"
                        >
                            Contacter le client
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
