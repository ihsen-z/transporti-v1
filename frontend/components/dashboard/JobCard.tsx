'use client';

import { MapPin, Package, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { formatTimeAgo } from '@/lib/notifications';
import { getStatusColor, getStatusLabel } from '@/lib/dashboard';
import type { Job } from '@/lib/dashboard';

interface JobCardProps {
    job: Job;
}

export default function JobCard({ job }: JobCardProps) {
    const statusColor = getStatusColor(job.status);
    const statusLabel = getStatusLabel(job.status);

    return (
        <Link href={`/jobs/${job.id}`}>
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-5 hover:shadow-md transition-all hover:border-primary-200 cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <h3 className="font-semibold text-neutral-900 mb-1 line-clamp-1">
                            {job.title}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                            {statusLabel}
                        </span>
                    </div>
                    <div className="text-right ml-4">
                        <p className="text-lg font-bold text-primary-700">{job.price} TND</p>
                        <p className="text-xs text-neutral-500">{formatTimeAgo(job.created_at)}</p>
                    </div>
                </div>

                <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-2">
                        <Package className="w-4 h-4 text-accent-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-neutral-700">{job.pickup}</p>
                    </div>
                    <div className="flex items-center gap-2 pl-6">
                        <ArrowRight className="w-4 h-4 text-neutral-400" />
                    </div>
                    <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-cta-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-neutral-700">{job.delivery}</p>
                    </div>
                </div>

                {job.transporter && (
                    <div className="pt-3 border-t border-neutral-100">
                        <p className="text-xs text-neutral-500">
                            Transporteur: <span className="font-medium text-neutral-700">{job.transporter}</span>
                        </p>
                    </div>
                )}
            </div>
        </Link>
    );
}
