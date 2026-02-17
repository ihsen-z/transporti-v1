'use client';

import React from 'react';
import {
    Home, ArrowUpDown, Users, Package, ShieldAlert,
    Wrench, Box, Camera,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface MovingDetailsFormProps {
    data: any;
    onChange: (data: any) => void;
}

const ROOM_OPTIONS = [
    { value: 'studio', label: 'Studio / S+0' },
    { value: '1', label: 'S+1 — 1 pièce' },
    { value: '2', label: 'S+2 — 2 pièces' },
    { value: '3', label: 'S+3 — 3 pièces' },
    { value: '4', label: 'S+4 — 4 pièces' },
    { value: '5+', label: 'Villa / Grand appartement' },
    { value: 'office', label: 'Bureau / Local commercial' },
];

const ELEVATOR_OPTIONS = [
    { value: 'yes', label: 'Oui' },
    { value: 'no', label: 'Non' },
    { value: 'small', label: 'Oui mais trop petit pour meubles' },
];

const HELPER_OPTIONS = [1, 2, 3, 4];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function MovingDetailsForm({ data, onChange }: MovingDetailsFormProps) {
    const specs = data.specifications || {};

    const update = (field: string, value: any) => {
        onChange({
            ...data,
            specifications: { ...specs, [field]: value },
        });
    };

    const handleDescriptionChange = (value: string) => {
        onChange({ ...data, description: value });
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const existing: string[] = data.photos || [];
        if (existing.length + files.length > 5) {
            alert('Maximum 5 photos autorisées.');
            return;
        }

        Array.from(files).forEach(file => {
            if (file.size > 5 * 1024 * 1024) {
                alert(`Le fichier "${file.name}" dépasse 5 MB.`);
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                const newPhotos = [...(data.photos || []), reader.result as string];
                onChange({ ...data, photos: newPhotos });
            };
            reader.readAsDataURL(file);
        });
    };

    const removePhoto = (idx: number) => {
        const updated = [...(data.photos || [])];
        updated.splice(idx, 1);
        onChange({ ...data, photos: updated });
    };

    return (
        <div className="space-y-8">
            {/* ------------------------------------------------------------------ */}
            {/*  Section 1: Logement & Volume                                      */}
            {/* ------------------------------------------------------------------ */}
            <section>
                <h3 className="text-base font-semibold text-neutral-800 flex items-center gap-2 mb-4">
                    <Home className="w-5 h-5 text-blue-600" />
                    Logement & Volume
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Room count */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Nombre de pièces
                        </label>
                        <select
                            value={specs.room_count || ''}
                            onChange={e => update('room_count', e.target.value)}
                            className="w-full p-3 border border-neutral-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        >
                            <option value="">— Sélectionner —</option>
                            {ROOM_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Estimated volume */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            <Box className="inline w-4 h-4 mr-1 text-neutral-500" />
                            Volume estimé (m³)
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={specs.volume || ''}
                            onChange={e => update('volume', e.target.value)}
                            placeholder="Ex: 15"
                            className="w-full p-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                        <p className="text-xs text-neutral-400 mt-1">
                            Astuce : un studio ≈ 10 m³, un S+2 ≈ 25-35 m³
                        </p>
                    </div>
                </div>
            </section>

            {/* ------------------------------------------------------------------ */}
            {/*  Section 2: Accès                                                  */}
            {/* ------------------------------------------------------------------ */}
            <section>
                <h3 className="text-base font-semibold text-neutral-800 flex items-center gap-2 mb-4">
                    <ArrowUpDown className="w-5 h-5 text-purple-600" />
                    Accès — Départ & Arrivée
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Departure */}
                    <div className="space-y-3 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                        <p className="text-sm font-semibold text-neutral-700">📤 Départ</p>
                        <div>
                            <label className="block text-xs font-medium text-neutral-600 mb-1">Étage</label>
                            <input
                                type="number"
                                min="0"
                                max="30"
                                value={specs.floor_departure ?? ''}
                                onChange={e => update('floor_departure', parseInt(e.target.value) || 0)}
                                placeholder="0 pour RDC"
                                className="w-full p-2.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-neutral-600 mb-1">Ascenseur</label>
                            <select
                                value={specs.elevator_departure || ''}
                                onChange={e => update('elevator_departure', e.target.value)}
                                className="w-full p-2.5 border border-neutral-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">— Sélectionner —</option>
                                {ELEVATOR_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Arrival */}
                    <div className="space-y-3 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                        <p className="text-sm font-semibold text-neutral-700">📥 Arrivée</p>
                        <div>
                            <label className="block text-xs font-medium text-neutral-600 mb-1">Étage</label>
                            <input
                                type="number"
                                min="0"
                                max="30"
                                value={specs.floor_arrival ?? ''}
                                onChange={e => update('floor_arrival', parseInt(e.target.value) || 0)}
                                placeholder="0 pour RDC"
                                className="w-full p-2.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-neutral-600 mb-1">Ascenseur</label>
                            <select
                                value={specs.elevator_arrival || ''}
                                onChange={e => update('elevator_arrival', e.target.value)}
                                className="w-full p-2.5 border border-neutral-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">— Sélectionner —</option>
                                {ELEVATOR_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </section>

            {/* ------------------------------------------------------------------ */}
            {/*  Section 3: Services & Main-d'œuvre                                */}
            {/* ------------------------------------------------------------------ */}
            <section>
                <h3 className="text-base font-semibold text-neutral-800 flex items-center gap-2 mb-4">
                    <Wrench className="w-5 h-5 text-emerald-600" />
                    Services demandés
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {([
                        { key: 'needs_disassembly', label: 'Démontage / remontage meubles', icon: Wrench },
                        { key: 'needs_packing', label: 'Emballage par le transporteur', icon: Package },
                        { key: 'has_fragile', label: 'Articles fragiles à protéger', icon: ShieldAlert },
                        { key: 'packing_materials_provided', label: "Matériaux d'emballage fournis", icon: Box },
                    ] as const).map(({ key, label, icon: Icon }) => (
                        <label
                            key={key}
                            className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${specs[key]
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                                }`}
                        >
                            <input
                                type="checkbox"
                                checked={!!specs[key]}
                                onChange={e => update(key, e.target.checked)}
                                className="sr-only"
                            />
                            <Icon className={`w-5 h-5 flex-shrink-0 ${specs[key] ? 'text-blue-600' : 'text-neutral-400'}`} />
                            <span className={`text-sm font-medium ${specs[key] ? 'text-blue-700' : 'text-neutral-700'}`}>
                                {label}
                            </span>
                            <div className={`ml-auto w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${specs[key] ? 'bg-blue-600 border-blue-600' : 'border-neutral-300'
                                }`}>
                                {specs[key] && (
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                        </label>
                    ))}
                </div>

                {/* Helpers count */}
                <div className="mt-4">
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        <Users className="inline w-4 h-4 mr-1 text-neutral-500" />
                        Manutentionnaires souhaités
                    </label>
                    <div className="flex gap-2">
                        {HELPER_OPTIONS.map(n => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => update('helpers_count', n)}
                                className={`w-12 h-12 rounded-xl font-semibold text-base transition-all ${specs.helpers_count === n
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                    }`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">
                        Nombre d&apos;aides pour le chargement / déchargement
                    </p>
                </div>
            </section>

            {/* ------------------------------------------------------------------ */}
            {/*  Section 4: Articles fragiles                                      */}
            {/* ------------------------------------------------------------------ */}
            {specs.has_fragile && (
                <section className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <h3 className="text-base font-semibold text-amber-800 flex items-center gap-2 mb-3">
                        <ShieldAlert className="w-5 h-5" />
                        Détails articles fragiles
                    </h3>
                    <textarea
                        value={specs.fragile_description || ''}
                        onChange={e => update('fragile_description', e.target.value)}
                        placeholder="Ex: Miroir ancien 1.5m × 1m, vaisselle fine (3 cartons), écran TV 55 pouces..."
                        className="w-full p-3 border border-amber-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-400 min-h-[80px] text-sm"
                    />
                </section>
            )}

            {/* ------------------------------------------------------------------ */}
            {/*  Section 5: Description & Instructions                             */}
            {/* ------------------------------------------------------------------ */}
            <section>
                <h3 className="text-base font-semibold text-neutral-800 mb-3">
                    Description & instructions spéciales
                </h3>
                <textarea
                    value={data.description || ''}
                    onChange={e => handleDescriptionChange(e.target.value)}
                    placeholder="Décrivez votre déménagement : mobilier principal, contraintes d'accès, horaires préférés..."
                    className="w-full p-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                />
            </section>

            {/* ------------------------------------------------------------------ */}
            {/*  Section 6: Photos                                                 */}
            {/* ------------------------------------------------------------------ */}
            <section>
                <h3 className="text-base font-semibold text-neutral-800 flex items-center gap-2 mb-3">
                    <Camera className="w-5 h-5 text-neutral-500" />
                    Photos (optionnel, max 5)
                </h3>

                <div className="flex flex-wrap gap-3 mb-3">
                    {(data.photos || []).map((photo: string, idx: number) => (
                        <div key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden border border-neutral-200 group">
                            <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={() => removePhoto(idx)}
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            >
                                <span className="text-white text-xs font-medium">Supprimer</span>
                            </button>
                        </div>
                    ))}

                    {(data.photos || []).length < 5 && (
                        <label className="w-24 h-24 rounded-lg border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                            <Camera className="w-5 h-5 text-neutral-400" />
                            <span className="text-xs text-neutral-400 mt-1">Ajouter</span>
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handlePhotoUpload}
                                className="sr-only"
                                multiple
                            />
                        </label>
                    )}
                </div>
                <p className="text-xs text-neutral-400">
                    JPG, PNG ou WebP — 5 MB max par photo
                </p>
            </section>
        </div>
    );
}
