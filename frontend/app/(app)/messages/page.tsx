'use client';

import React from 'react';
import Link from 'next/link';
import { MessageSquare, Search, ArrowRight } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Messages Inbox — Lists all conversations                                  */
/* -------------------------------------------------------------------------- */

const MOCK_CONVERSATIONS = [
    {
        jobId: 1,
        title: 'Déménagement Tunis → Sousse',
        lastMessage: 'Bonjour, je suis disponible samedi matin.',
        senderName: 'Mohamed T.',
        timestamp: '2026-02-12T14:30:00Z',
        unread: 2,
        status: 'active',
    },
    {
        jobId: 2,
        title: 'Transport meubles — Nabeul',
        lastMessage: 'Merci, la livraison est confirmée.',
        senderName: 'Leila B.',
        timestamp: '2026-02-11T09:15:00Z',
        unread: 0,
        status: 'completed',
    },
    {
        jobId: 3,
        title: 'Colis fragile — Sfax',
        lastMessage: 'Pouvez-vous envoyer une photo de l\'emballage ?',
        senderName: 'Ahmed K.',
        timestamp: '2026-02-10T16:45:00Z',
        unread: 1,
        status: 'active',
    },
];

export default function MessagesInboxPage() {
    return (
        <div className="p-6 lg:p-8 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">Messages</h1>
                    <p className="text-sm text-neutral-500 mt-1">
                        {MOCK_CONVERSATIONS.length} conversation{MOCK_CONVERSATIONS.length > 1 ? 's' : ''}
                    </p>
                </div>
                <div className="relative">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        className="pl-9 pr-4 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-48"
                    />
                </div>
            </div>

            {/* Conversations List */}
            {MOCK_CONVERSATIONS.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-8 h-8 text-neutral-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-2">Aucun message</h3>
                    <p className="text-neutral-500 text-sm">
                        Vos conversations apparaîtront ici une fois que vous aurez réservé un transport.
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {MOCK_CONVERSATIONS.map((conv) => (
                        <Link
                            key={conv.jobId}
                            href={`/messages/${conv.jobId}`}
                            className="flex items-center gap-4 p-4 bg-white border border-neutral-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all group"
                        >
                            {/* Avatar */}
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-lg font-semibold text-blue-700">
                                    {conv.senderName.charAt(0)}
                                </span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="text-sm font-semibold text-neutral-900 truncate">
                                        {conv.senderName}
                                    </h3>
                                    <span className="text-xs text-neutral-400 flex-shrink-0 ml-2">
                                        {new Date(conv.timestamp).toLocaleDateString('fr-FR', {
                                            day: 'numeric',
                                            month: 'short',
                                        })}
                                    </span>
                                </div>
                                <p className="text-xs text-neutral-500 mb-1 truncate">{conv.title}</p>
                                <p className="text-sm text-neutral-600 truncate">{conv.lastMessage}</p>
                            </div>

                            {/* Unread badge + Arrow */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {conv.unread > 0 && (
                                    <span className="w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                        {conv.unread}
                                    </span>
                                )}
                                <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-blue-500 transition-colors" />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
