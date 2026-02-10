import React, { useState } from 'react';
import { Package, Camera, Weight, Box } from 'lucide-react';

interface TransportDetailsFormProps {
    data: any;
    onChange: (data: any) => void;
}

export function TransportDetailsForm({ data, onChange }: TransportDetailsFormProps) {
    const [photos, setPhotos] = useState<string[]>(data.photos || []);
    const [photoUrlInput, setPhotoUrlInput] = useState('');

    const handleChange = (field: string, value: any) => {
        onChange({ ...data, [field]: value });
    };

    const addPhoto = () => {
        if (photoUrlInput) {
            const newPhotos = [...photos, photoUrlInput];
            setPhotos(newPhotos);
            handleChange('photos', newPhotos);
            setPhotoUrlInput('');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description des articles
                </label>
                <textarea
                    value={data.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Ex: Un canapé 3 places et deux fauteuils..."
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Weight className="inline w-4 h-4 mr-1" /> Poids estimé (kg)
                    </label>
                    <input
                        type="number"
                        value={data.specifications?.weight || ''}
                        onChange={(e) => handleChange('specifications', { ...data.specifications, weight: e.target.value })}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: 50"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Box className="inline w-4 h-4 mr-1" /> Volume estimé (m³)
                    </label>
                    <input
                        type="number"
                        step="0.1"
                        value={data.specifications?.volume || ''}
                        onChange={(e) => handleChange('specifications', { ...data.specifications, volume: e.target.value })}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: 2.5"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Photos (URL)
                </label>
                <div className="flex gap-2 mb-2">
                    <input
                        type="url"
                        value={photoUrlInput}
                        onChange={(e) => setPhotoUrlInput(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="flex-1 p-2 border rounded-lg"
                    />
                    <button
                        type="button"
                        onClick={addPhoto}
                        className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                        Ajouter
                    </button>
                </div>

                {photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                        {photos.map((photo, index) => (
                            <div key={index} className="relative aspect-square border rounded-lg overflow-hidden bg-gray-50">
                                <img src={photo} alt={`Item ${index + 1}`} className="object-cover w-full h-full" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
