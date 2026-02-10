'use client';

import React from 'react';
import { Star, User } from 'lucide-react';

interface Review {
    id: number;
    reviewer_name: string;
    rating: number;
    comment: string;
    created_at: string;
    aspects?: Record<string, number>;
}

interface Props {
    reviews: Review[];
    totalCount: number;
}

function StarRating({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(v => (
                <Star key={v} className={`w-3.5 h-3.5 ${v <= rating ? 'text-amber-400 fill-amber-400' : 'text-neutral-200'}`} />
            ))}
        </div>
    );
}

export function ReviewsList({ reviews, totalCount }: Props) {
    return (
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-900">Avis</h3>
                <span className="text-sm text-neutral-500">{totalCount} avis</span>
            </div>

            {reviews.length > 0 ? (
                <div className="divide-y divide-neutral-50">
                    {reviews.map(review => (
                        <div key={review.id} className="px-6 py-4">
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                    <User className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-sm font-medium text-neutral-900">{review.reviewer_name}</p>
                                        <p className="text-xs text-neutral-400">
                                            {new Date(review.created_at).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <StarRating rating={review.rating} />
                                    <p className="text-sm text-neutral-600 mt-2 leading-relaxed">{review.comment}</p>

                                    {/* Aspect ratings */}
                                    {review.aspects && Object.keys(review.aspects).length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {Object.entries(review.aspects).map(([key, val]) => (
                                                <span key={key} className="text-xs bg-neutral-50 text-neutral-600 px-2 py-1 rounded-full">
                                                    {key}: {val}/5
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center">
                    <Star className="w-8 h-8 text-neutral-200 mx-auto mb-2" />
                    <p className="text-sm text-neutral-400">Aucun avis pour le moment</p>
                </div>
            )}
        </div>
    );
}
