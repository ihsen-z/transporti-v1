'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { MessageBubble } from '@/components/messaging/MessageBubble';
import { ContactReveal } from '@/components/messaging/ContactReveal';
import { checkForBypass } from '@/lib/antiBypass';
import { ArrowLeft, Send, Info, AlertTriangle, Truck, MapPin } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Mock Data                                                                 */
/* -------------------------------------------------------------------------- */

const MOCK_JOB = {
    id: 1,
    pickup_address: 'Tunis — La Marsa',
    dropoff_address: 'Sousse Centre',
    status: 'IN_PROGRESS',
    job_type: 'MOVING',
};

const MOCK_OTHER_PARTY = {
    id: 99,
    name: 'Mohamed Trabelsi',
    phone: '+216 98 765 432',
    email: 'm.trabelsi@email.com',
    role: 'TRANSPORTER',
};

const MOCK_MESSAGES = [
    {
        id: 1,
        sender_id: 99,
        sender_name: 'Mohamed T.',
        content: 'Bonjour ! Je confirme ma disponibilité pour le 15 février à 8h. Est-ce que l\'accès au parking est facile ?',
        timestamp: '2026-02-12T14:30:00Z',
        is_read: true,
    },
    {
        id: 2,
        sender_id: 1,
        sender_name: 'Vous',
        content: 'Oui, il y a un parking juste devant l\'immeuble. L\'ascenseur est assez grand pour les meubles.',
        timestamp: '2026-02-12T14:35:00Z',
        is_read: true,
    },
    {
        id: 3,
        sender_id: 99,
        sender_name: 'Mohamed T.',
        content: 'Parfait ! Je viendrai avec 2 aides. On prévoit environ 3h pour le chargement. Avez-vous des cartons déjà prêts ?',
        timestamp: '2026-02-12T14:40:00Z',
        is_read: false,
    },
];

/* -------------------------------------------------------------------------- */
/*  Messaging Page                                                            */
/* -------------------------------------------------------------------------- */

export default function MessagingPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const jobId = params?.jobId;
    const currentUserId = user?.id || 1;
    const isBookingConfirmed = MOCK_JOB.status === 'IN_PROGRESS' || MOCK_JOB.status === 'COMPLETED';

    const [messages, setMessages] = useState(MOCK_MESSAGES);
    const [newMessage, setNewMessage] = useState('');
    const [bypassWarning, setBypassWarning] = useState<string | null>(null);
    const [sending, setSending] = useState(false);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!newMessage.trim()) return;

        // Anti-bypass check
        const bypassCheck = checkForBypass(newMessage);
        if (bypassCheck.hasBypass) {
            setBypassWarning(
                'Votre message contient des informations de contact. Pour votre sécurité, les échanges de coordonnées ne sont autorisés qu\'après confirmation de la réservation.'
            );
            return;
        }

        setSending(true);
        setBypassWarning(null);

        // Simulate sending
        const msg = {
            id: Date.now(),
            sender_id: currentUserId,
            sender_name: 'Vous',
            content: newMessage.trim(),
            timestamp: new Date().toISOString(),
            is_read: false,
        };

        setMessages(prev => [...prev, msg]);
        setNewMessage('');
        setSending(false);

        // In production: POST to /api/messaging/jobs/{jobId}/messages/
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto">
            {/* ---------------------------------------------------------------- */}
            {/*  Header                                                         */}
            {/* ---------------------------------------------------------------- */}
            <div className="bg-white border-b border-neutral-200 px-4 py-3 flex items-center gap-4 flex-shrink-0">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-neutral-600" />
                </button>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 truncate">
                        {MOCK_OTHER_PARTY.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <Truck className="w-3.5 h-3.5" />
                        <span className="truncate">
                            {MOCK_JOB.pickup_address} → {MOCK_JOB.dropoff_address}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        MOCK_JOB.status === 'IN_PROGRESS'
                            ? 'bg-blue-50 text-blue-700'
                            : MOCK_JOB.status === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-neutral-100 text-neutral-600'
                    }`}>
                        {MOCK_JOB.status === 'IN_PROGRESS' ? 'En cours' : MOCK_JOB.status === 'COMPLETED' ? 'Terminée' : MOCK_JOB.status}
                    </span>
                </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/*  Contact Reveal                                                 */}
            {/* ---------------------------------------------------------------- */}
            <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200 flex-shrink-0">
                <ContactReveal
                    isBookingConfirmed={isBookingConfirmed}
                    phone={MOCK_OTHER_PARTY.phone}
                    email={MOCK_OTHER_PARTY.email}
                    name={MOCK_OTHER_PARTY.name}
                />
            </div>

            {/* ---------------------------------------------------------------- */}
            {/*  Messages                                                       */}
            {/* ---------------------------------------------------------------- */}
            <div className="flex-1 overflow-y-auto px-4 py-6 bg-white">
                {/* System message */}
                <div className="flex justify-center mb-6">
                    <div className="bg-neutral-100 rounded-full px-4 py-1.5 flex items-center gap-2">
                        <Info className="w-3.5 h-3.5 text-neutral-400" />
                        <span className="text-xs text-neutral-500">
                            Conversation liée à la mission #{jobId}
                        </span>
                    </div>
                </div>

                {messages.map(msg => (
                    <MessageBubble
                        key={msg.id}
                        content={msg.content}
                        timestamp={msg.timestamp}
                        isSender={msg.sender_id === currentUserId}
                        senderName={msg.sender_name}
                        isRead={msg.is_read}
                    />
                ))}

                <div ref={messagesEndRef} />
            </div>

            {/* ---------------------------------------------------------------- */}
            {/*  Bypass Warning                                                 */}
            {/* ---------------------------------------------------------------- */}
            {bypassWarning && (
                <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 flex items-start gap-2 flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">{bypassWarning}</p>
                    <button
                        onClick={() => setBypassWarning(null)}
                        className="text-amber-600 hover:text-amber-800 text-xs font-medium ml-auto flex-shrink-0"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* ---------------------------------------------------------------- */}
            {/*  Input                                                          */}
            {/* ---------------------------------------------------------------- */}
            <div className="bg-white border-t border-neutral-200 px-4 py-3 flex-shrink-0">
                <div className="flex items-end gap-3">
                    <textarea
                        value={newMessage}
                        onChange={e => {
                            setNewMessage(e.target.value);
                            if (bypassWarning) setBypassWarning(null);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Tapez votre message..."
                        rows={1}
                        className="flex-1 p-3 border border-neutral-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm max-h-32"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sending}
                        className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
