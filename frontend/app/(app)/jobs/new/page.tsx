'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ChevronLeft, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { JobTypeSelector } from '@/components/jobs/JobTypeSelector';
import { LocationPicker } from '@/components/jobs/LocationPicker';
import { TransportDetailsForm } from '@/components/jobs/TransportDetailsForm';
import { MovingDetailsForm } from '@/components/jobs/MovingDetailsForm';
import { JobPreview } from '@/components/jobs/JobPreview';

const STEPS = [
    { id: 'type', title: 'Type de service' },
    { id: 'location', title: 'Adresses' },
    { id: 'details', title: 'Détails' },
    { id: 'schedule', title: 'Date & Budget' },
    { id: 'preview', title: 'Confirmation' },
];

export default function NewJobPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        job_type: null as 'TRANSPORT' | 'MOVING' | null,
        pickup_address: '',
        pickup_governorate: '',
        dropoff_address: '',
        dropoff_governorate: '',
        description: '',
        photos: [] as string[],
        specifications: {},
        scheduled_time: '',
        price_tnd_min: '',
        price_tnd_max: '',
    });

    const [validationError, setValidationError] = useState<string | null>(null);

    const handleNext = () => {
        setValidationError(null);

        // Step 3 validation: date is required and ≥ 24h from now
        if (currentStep === 3 && !formData.scheduled_time) {
            setValidationError('Veuillez sélectionner une date et heure.');
            return;
        }
        if (currentStep === 3 && formData.scheduled_time) {
            const selected = new Date(formData.scheduled_time);
            const minDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
            if (selected < minDate) {
                setValidationError('La date doit être au moins 24h dans le futur pour maximiser les offres.');
                return;
            }
        }

        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
            window.scrollTo(0, 0);
        } else {
            handleSubmit();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
            window.scrollTo(0, 0);
        }
    };

    const handleSubmit = async () => {
        if (loading) return;
        setLoading(true);
        try {
            console.log('Submitting Job Data:', formData);
            const data = await apiClient.post<{ message: string; job: { id: number } }>('/api/jobs/', formData);
            
            if (data && data.job) {
                router.push(`/jobs/${data.job.id}`);
            } else {
                router.push('/jobs');
            }
        } catch (error: any) {
            console.error('Publish Error:', error);
            
            // Extract detailed error message if available
            let errorMessage = 'Une erreur est survenue lors de la publication.';
            
            if (error.response && typeof error.response === 'object') {
                errorMessage += '\n' + JSON.stringify(error.response, null, 2);
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const updateFormData = (newData: any) => {
        setFormData(prev => {
            const updated = { ...prev, ...newData };
            // Ensure specifications is merged, not replaced
            if (newData.specifications && prev.specifications) {
                updated.specifications = { ...prev.specifications, ...newData.specifications };
            }
            return updated;
        });
    };

    const renderStep = () => {
        switch (currentStep) {
            case 0:
                return (
                    <JobTypeSelector
                        selectedType={formData.job_type}
                        onSelect={(type) => updateFormData({ job_type: type })}
                    />
                );
            case 1:
                return (
                    <LocationPicker
                        data={formData}
                        onChange={updateFormData}
                    />
                );
            case 2:
                return formData.job_type === 'TRANSPORT' ? (
                    <TransportDetailsForm data={formData} onChange={updateFormData} />
                ) : (
                    <MovingDetailsForm data={formData} onChange={updateFormData} />
                );
            case 3:
                return (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date et heure souhaitées
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.scheduled_time}
                                min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                                onChange={(e) => {
                                    updateFormData({ scheduled_time: e.target.value });
                                    setValidationError(null);
                                }}
                                className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 transition-colors ${validationError ? 'border-red-400 bg-red-50' : 'border-neutral-300'
                                    }`}
                            />
                            {validationError ? (
                                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    {validationError}
                                </p>
                            ) : (
                                <p className="text-sm text-neutral-500 mt-1">
                                    Minimum 24h à l&apos;avance pour maximiser les offres reçues.
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Budget Min (TND)
                                </label>
                                <input
                                    type="number"
                                    value={formData.price_tnd_min}
                                    onChange={(e) => updateFormData({ price_tnd_min: e.target.value })}
                                    placeholder="Optionnel"
                                    className="w-full p-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Budget Max (TND)
                                </label>
                                <input
                                    type="number"
                                    value={formData.price_tnd_max}
                                    onChange={(e) => updateFormData({ price_tnd_max: e.target.value })}
                                    placeholder="Optionnel"
                                    className="w-full p-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 4:
                return <JobPreview data={formData} />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                        {STEPS.map((step, index) => (
                            <div key={step.id} className="flex flex-col items-center flex-1 relative">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold z-10 transition-colors
                    ${index <= currentStep
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 text-gray-500'}`}
                                >
                                    {index < currentStep ? <Check className="w-5 h-5" /> : index + 1}
                                </div>
                                <span className="text-xs mt-2 text-gray-600 hidden sm:block">{step.title}</span>

                                {/* Connecting Line */}
                                {index < STEPS.length - 1 && (
                                    <div
                                        className={`absolute top-4 left-1/2 w-full h-[2px] -z-0 transition-colors
                    ${index < currentStep ? 'bg-blue-600' : 'bg-gray-200'}`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content Card */}
                <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                        {STEPS[currentStep].title}
                    </h2>

                    {renderStep()}

                    {/* Actions */}
                    <div className="mt-8 flex justify-between pt-6 border-t">
                        <button
                            onClick={handleBack}
                            disabled={currentStep === 0 || loading}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-colors
                ${currentStep === 0
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-700 hover:bg-gray-100'}`}
                        >
                            <ChevronLeft className="w-5 h-5" />
                            Retour
                        </button>

                        <button
                            onClick={handleNext}
                            disabled={loading || (currentStep === 0 && !formData.job_type)}
                            className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                'Publication...'
                            ) : currentStep === STEPS.length - 1 ? (
                                'Publier ma demande'
                            ) : (
                                <>
                                    Suivant
                                    <ChevronRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
