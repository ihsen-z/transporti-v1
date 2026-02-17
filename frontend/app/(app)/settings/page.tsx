'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
    User, Mail, Phone, MapPin, Bell, Shield, Camera,
    Save, CheckCircle, Eye, EyeOff, Lock, Globe
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Settings Page                                                             */
/* -------------------------------------------------------------------------- */

type SettingsTab = 'profile' | 'notifications' | 'security' | 'preferences';

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'preferences', label: 'Préférences', icon: Globe },
];

export default function SettingsPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const [saved, setSaved] = useState(false);

    // Profile form
    const [firstName, setFirstName] = useState(user?.first_name || '');
    const [lastName, setLastName] = useState(user?.last_name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [governorate, setGovernorate] = useState('Tunis');

    // Security form
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);

    // Notification preferences
    const [notifEmail, setNotifEmail] = useState(true);
    const [notifPush, setNotifPush] = useState(true);
    const [notifSms, setNotifSms] = useState(false);
    const [notifNewOffer, setNotifNewOffer] = useState(true);
    const [notifBooking, setNotifBooking] = useState(true);
    const [notifMessage, setNotifMessage] = useState(true);

    // Preferences
    const [language, setLanguage] = useState('fr');
    const [currency, setCurrency] = useState('TND');

    const GOVERNORATES = [
        'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
        'Bizerte', 'Béja', 'Jendouba', 'Le Kef', 'Siliana', 'Sousse',
        'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid',
        'Gabès', 'Médenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kébili',
    ];

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`w-11 h-6 rounded-full relative transition-colors ${checked ? 'bg-blue-600' : 'bg-neutral-300'
                }`}
        >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${checked ? 'translate-x-5' : ''
                }`} />
        </button>
    );

    return (
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-neutral-900">Paramètres</h1>
                <p className="text-neutral-500 mt-1">Gérez votre profil, vos notifications et votre sécurité.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar Tabs */}
                <div className="lg:w-56 flex-shrink-0">
                    <div className="flex lg:flex-col gap-1 bg-neutral-100 lg:bg-transparent rounded-xl lg:rounded-none p-1 lg:p-0 overflow-x-auto">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id
                                        ? 'bg-white text-neutral-900 shadow-sm lg:bg-blue-50 lg:text-blue-700'
                                        : 'text-neutral-500 hover:text-neutral-700 lg:hover:bg-neutral-50'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-6">
                            <h2 className="text-lg font-semibold text-neutral-900">Informations personnelles</h2>

                            {/* Avatar */}
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-2xl">
                                    {firstName?.[0] || 'U'}
                                </div>
                                <button className="flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
                                    <Camera className="w-4 h-4" />
                                    Changer la photo
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-1">Prénom</label>
                                    <input value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full p-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-1">Nom</label>
                                    <input value={lastName} onChange={e => setLastName(e.target.value)} className="w-full p-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    <Mail className="w-4 h-4 inline mr-1" /> Email
                                </label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    <Phone className="w-4 h-4 inline mr-1" /> Téléphone
                                </label>
                                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+216 XX XXX XXX" className="w-full p-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    <MapPin className="w-4 h-4 inline mr-1" /> Gouvernorat
                                </label>
                                <select value={governorate} onChange={e => setGovernorate(e.target.value)} className="w-full p-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500">
                                    {GOVERNORATES.map(g => (
                                        <option key={g} value={g}>{g}</option>
                                    ))}
                                </select>
                            </div>

                            <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                                {saved ? <CheckCircle className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                                {saved ? 'Sauvegardé !' : 'Sauvegarder'}
                            </button>
                        </div>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === 'notifications' && (
                        <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-6">
                            <h2 className="text-lg font-semibold text-neutral-900">Canaux de notification</h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between py-2">
                                    <div><p className="text-sm font-medium text-neutral-900">Email</p><p className="text-xs text-neutral-500">Recevez les notifications par email</p></div>
                                    <Toggle checked={notifEmail} onChange={setNotifEmail} />
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <div><p className="text-sm font-medium text-neutral-900">Notifications push</p><p className="text-xs text-neutral-500">Notifications dans le navigateur</p></div>
                                    <Toggle checked={notifPush} onChange={setNotifPush} />
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <div><p className="text-sm font-medium text-neutral-900">SMS</p><p className="text-xs text-neutral-500">Alertes importantes par SMS</p></div>
                                    <Toggle checked={notifSms} onChange={setNotifSms} />
                                </div>
                            </div>

                            <hr className="border-neutral-100" />

                            <h2 className="text-lg font-semibold text-neutral-900">Types de notification</h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between py-2">
                                    <div><p className="text-sm font-medium text-neutral-900">Nouvelles offres</p><p className="text-xs text-neutral-500">Quand un transporteur soumet une offre</p></div>
                                    <Toggle checked={notifNewOffer} onChange={setNotifNewOffer} />
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <div><p className="text-sm font-medium text-neutral-900">Réservations</p><p className="text-xs text-neutral-500">Confirmation et mises à jour</p></div>
                                    <Toggle checked={notifBooking} onChange={setNotifBooking} />
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <div><p className="text-sm font-medium text-neutral-900">Messages</p><p className="text-xs text-neutral-500">Nouveaux messages reçus</p></div>
                                    <Toggle checked={notifMessage} onChange={setNotifMessage} />
                                </div>
                            </div>

                            <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                                {saved ? <CheckCircle className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                                {saved ? 'Sauvegardé !' : 'Sauvegarder les préférences'}
                            </button>
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-6">
                            <h2 className="text-lg font-semibold text-neutral-900">Changer le mot de passe</h2>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Mot de passe actuel</label>
                                <div className="relative">
                                    <input type={showPasswords ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full p-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 pr-10" />
                                    <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                                        {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-1">Nouveau mot de passe</label>
                                    <input type={showPasswords ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-1">Confirmer</label>
                                    <input type={showPasswords ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>

                            {newPassword && confirmPassword && newPassword !== confirmPassword && (
                                <p className="text-sm text-red-500">Les mots de passe ne correspondent pas.</p>
                            )}

                            <button onClick={handleSave} disabled={!currentPassword || !newPassword || newPassword !== confirmPassword} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <Lock className="w-5 h-5" />
                                Mettre à jour le mot de passe
                            </button>
                        </div>
                    )}

                    {/* Preferences Tab */}
                    {activeTab === 'preferences' && (
                        <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-6">
                            <h2 className="text-lg font-semibold text-neutral-900">Préférences</h2>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Langue</label>
                                <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full p-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500">
                                    <option value="fr">Français</option>
                                    <option value="ar" disabled>العربية (Bientôt)</option>
                                    <option value="en" disabled>English (Coming soon)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Devise</label>
                                <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full p-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500">
                                    <option value="TND">Dinar Tunisien (TND)</option>
                                </select>
                            </div>

                            <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                                {saved ? <CheckCircle className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                                {saved ? 'Sauvegardé !' : 'Sauvegarder'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
