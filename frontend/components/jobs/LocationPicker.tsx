import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

interface LocationPickerProps {
    data: any;
    onChange: (data: any) => void;
}

export function LocationPicker({ data, onChange }: LocationPickerProps) {
    const handleChange = (field: string, value: any) => {
        // Only send the field that changed. 
        // Parent handleFormData uses a functional update to merge it.
        onChange({ [field]: value });
    };

    return (
        <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
                <div className="mt-1 bg-white p-1 rounded-full text-blue-600">
                    <Navigation className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="font-semibold text-blue-900">Astuce de localisation</h4>
                    <p className="text-sm text-blue-700">
                        Pour plus de précision, vous pouvez utiliser les coordonnées GPS si l'adresse n'est pas exacte.
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                {/* Pickup Section */}
                <div className="border rounded-xl p-4 bg-white shadow-sm">
                    <div className="flex items-center gap-2 mb-3 text-orange-600 font-semibold">
                        <MapPin className="w-5 h-5" />
                        <h3>Point de Départ</h3>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Adresse complète</label>
                            <input
                                type="text"
                                value={data.pickup_address || ''}
                                onChange={(e) => handleChange('pickup_address', e.target.value)}
                                placeholder="Ex: 12 Rue de la République, Tunis"
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Gouvernorat</label>
                                <select
                                    value={data.pickup_governorate || ''}
                                    onChange={(e) => handleChange('pickup_governorate', e.target.value)}
                                    className="w-full p-2 border rounded-lg text-sm"
                                >
                                    <option value="">Choisir...</option>
                                    <option value="Tunis">Tunis</option>
                                    <option value="Ariana">Ariana</option>
                                    <option value="Ben Arous">Ben Arous</option>
                                    <option value="Manouba">Manouba</option>
                                    <option value="Nabeul">Nabeul</option>
                                    <option value="Zaghouan">Zaghouan</option>
                                    <option value="Bizerte">Bizerte</option>
                                    <option value="Béja">Béja</option>
                                    <option value="Jendouba">Jendouba</option>
                                    <option value="Kef">Kef</option>
                                    <option value="Siliana">Siliana</option>
                                    <option value="Sousse">Sousse</option>
                                    <option value="Monastir">Monastir</option>
                                    <option value="Mahdia">Mahdia</option>
                                    <option value="Sfax">Sfax</option>
                                    <option value="Kairouan">Kairouan</option>
                                    <option value="Kasserine">Kasserine</option>
                                    <option value="Sidi Bouzid">Sidi Bouzid</option>
                                    <option value="Gabès">Gabès</option>
                                    <option value="Medenine">Medenine</option>
                                    <option value="Tataouine">Tataouine</option>
                                    <option value="Gafsa">Gafsa</option>
                                    <option value="Tozeur">Tozeur</option>
                                    <option value="Kebili">Kebili</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Code Postal</label>
                                <input
                                    type="text"
                                    value={data.pickup_postal_code || ''}
                                    onChange={(e) => handleChange('pickup_postal_code', e.target.value)}
                                    className="w-full p-2 border rounded-lg text-sm"
                                    placeholder="Ex: 1001"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dropoff Section */}
                <div className="border rounded-xl p-4 bg-white shadow-sm">
                    <div className="flex items-center gap-2 mb-3 text-green-600 font-semibold">
                        <MapPin className="w-5 h-5" />
                        <h3>Destination</h3>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Adresse complète</label>
                            <input
                                type="text"
                                value={data.dropoff_address || ''}
                                onChange={(e) => handleChange('dropoff_address', e.target.value)}
                                placeholder="Ex: Zone Industrielle, Sfax"
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Gouvernorat</label>
                                <select
                                    value={data.dropoff_governorate || ''}
                                    onChange={(e) => handleChange('dropoff_governorate', e.target.value)}
                                    className="w-full p-2 border rounded-lg text-sm"
                                >
                                    <option value="">Choisir...</option>
                                    <option value="Tunis">Tunis</option>
                                    <option value="Ariana">Ariana</option>
                                    <option value="Ben Arous">Ben Arous</option>
                                    <option value="Manouba">Manouba</option>
                                    <option value="Nabeul">Nabeul</option>
                                    <option value="Zaghouan">Zaghouan</option>
                                    <option value="Bizerte">Bizerte</option>
                                    <option value="Béja">Béja</option>
                                    <option value="Jendouba">Jendouba</option>
                                    <option value="Kef">Kef</option>
                                    <option value="Siliana">Siliana</option>
                                    <option value="Sousse">Sousse</option>
                                    <option value="Monastir">Monastir</option>
                                    <option value="Mahdia">Mahdia</option>
                                    <option value="Sfax">Sfax</option>
                                    <option value="Kairouan">Kairouan</option>
                                    <option value="Kasserine">Kasserine</option>
                                    <option value="Sidi Bouzid">Sidi Bouzid</option>
                                    <option value="Gabès">Gabès</option>
                                    <option value="Medenine">Medenine</option>
                                    <option value="Tataouine">Tataouine</option>
                                    <option value="Gafsa">Gafsa</option>
                                    <option value="Tozeur">Tozeur</option>
                                    <option value="Kebili">Kebili</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Code Postal</label>
                                <input
                                    type="text"
                                    value={data.dropoff_postal_code || ''}
                                    onChange={(e) => handleChange('dropoff_postal_code', e.target.value)}
                                    className="w-full p-2 border rounded-lg text-sm"
                                    placeholder="Ex: 3000"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
