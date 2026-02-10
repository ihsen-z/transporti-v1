import React from 'react';
import { Home, Building, Truck, Briefcase } from 'lucide-react';

interface MovingDetailsFormProps {
    data: any;
    onChange: (data: any) => void;
}

export function MovingDetailsForm({ data, onChange }: MovingDetailsFormProps) {
    const handleChange = (field: string, value: any) => {
        onChange({
            ...data,
            specifications: { ...data.specifications, [field]: value }
        });
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Home className="inline w-4 h-4 mr-1" /> Nombre de pièces
                    </label>
                    <select
                        value={data.specifications?.rooms || ''}
                        onChange={(e) => handleChange('rooms', e.target.value)}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Sélectionner</option>
                        <option value="1">Studio / S+0</option>
                        <option value="2">S+1</option>
                        <option value="3">S+2</option>
                        <option value="4">S+3</option>
                        <option value="5+">Villa / Grand appartement</option>
                        <option value="office">Bureau / Local commercial</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Building className="inline w-4 h-4 mr-1" /> Étage (Départ)
                    </label>
                    <input
                        type="number"
                        value={data.specifications?.floor_pickup || ''}
                        onChange={(e) => handleChange('floor_pickup', e.target.value)}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="0 for RDC"
                    />
                </div>
            </div>

            <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={data.specifications?.elevator || false}
                        onChange={(e) => handleChange('elevator', e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="flex-1">Ascenseur disponible au départ ?</span>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={data.specifications?.packing_service || false}
                        onChange={(e) => handleChange('packing_service', e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="flex-1">Besoin d'aide pour l'emballage ?</span>
                    <Briefcase className="w-5 h-5 text-gray-400" />
                </label>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Items fragiles ou lourds (Piano, Coffre-fort...)
                </label>
                <textarea
                    value={data.specifications?.special_items || ''}
                    onChange={(e) => handleChange('special_items', e.target.value)}
                    placeholder="Listez les objets nécessitant une attention particulière..."
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 h-24"
                />
            </div>
        </div>
    );
}
