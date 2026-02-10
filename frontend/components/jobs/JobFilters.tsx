import React from 'react';
import { Filter, MapPin, Truck, Home } from 'lucide-react';

interface JobFiltersProps {
    filters: any;
    onChange: (filters: any) => void;
}

export function JobFilters({ filters, onChange }: JobFiltersProps) {
    const handleChange = (field: string, value: any) => {
        onChange({ ...filters, [field]: value });
    };

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-4 text-gray-900 font-semibold">
                <Filter className="w-5 h-5" />
                <h3>Filtres</h3>
            </div>

            <div className="space-y-6">
                {/* Type of Service */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type de service</label>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="job_type"
                                checked={filters.job_type === ''}
                                onChange={() => handleChange('job_type', '')}
                                className="text-blue-600"
                            />
                            <span className="text-sm">Tous</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="job_type"
                                checked={filters.job_type === 'TRANSPORT'}
                                onChange={() => handleChange('job_type', 'TRANSPORT')}
                                className="text-blue-600"
                            />
                            <Truck className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">Transport</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="job_type"
                                checked={filters.job_type === 'MOVING'}
                                onChange={() => handleChange('job_type', 'MOVING')}
                                className="text-blue-600"
                            />
                            <Home className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">Déménagement</span>
                        </label>
                    </div>
                </div>

                {/* Location (Governorate) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <MapPin className="inline w-4 h-4 mr-1" />
                        Gouvernorat (Départ)
                    </label>
                    <select
                        value={filters.pickup_governorate || ''}
                        onChange={(e) => handleChange('pickup_governorate', e.target.value)}
                        className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Tous</option>
                        <option value="Tunis">Tunis</option>
                        <option value="Ariana">Ariana</option>
                        <option value="Ben Arous">Ben Arous</option>
                        <option value="Manouba">Manouba</option>
                        <option value="Sfax">Sfax</option>
                        <option value="Sousse">Sousse</option>
                        <option value="Monastir">Monastir</option>
                        <option value="Nabeul">Nabeul</option>
                        {/* Add others as needed */}
                    </select>
                </div>

                {/* Budget Range */}
                {/* Placeholder for budget range slider later */}
            </div>
        </div>
    );
}
