'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Play,
    ArrowRight,
    CheckCircle,
    Package,
    MapPin,
    Bell,
    TrendingUp,
    RotateCcw,
    Home,
    LayoutDashboard,
    Truck,
    Award,
} from 'lucide-react';
import {
    deliveryWorkflowSteps,
    DeliverySimulationLogger,
} from '@/lib/simulationDelivery';

export default function DeliverySimulationPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [isStarted, setIsStarted] = useState(false);
    const [logger] = useState(() => new DeliverySimulationLogger());
    const [logs, setLogs] = useState<string[]>([]);
    const [jobStatus, setJobStatus] = useState<'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED'>('PENDING');
    const [showJobModal, setShowJobModal] = useState(false);
    const [showSummary, setShowSummary] = useState(false);

    const currentStepData = deliveryWorkflowSteps[currentStep];

    const addLog = (action: string, details?: string) => {
        if (currentStepData) {
            logger.addLog(currentStep + 1, currentStepData.title, action, details);
            setLogs(logger.export().split('\n'));
        }
    };

    const startSimulation = () => {
        setIsStarted(true);
        setCurrentStep(0);
        logger.clear();
        addLog('Simulation started', 'User begins delivery workflow');
    };

    const nextStep = () => {
        if (currentStep < deliveryWorkflowSteps.length - 1) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const goToRoute = (route: string) => {
        addLog(`Navigating to ${route}`);
        router.push(route);
        setTimeout(() => nextStep(), 1000);
    };

    const simulateJobCreation = () => {
        setShowJobModal(true);
        addLog('Job created', 'Tunis Centre → Sousse Ville (120 TND)');
    };

    const confirmJobCreation = () => {
        setShowJobModal(false);
        addLog('Job confirmed', 'Status: PENDING');
        setTimeout(() => nextStep(), 500);
    };

    const updateJobStatus = (newStatus: typeof jobStatus) => {
        setJobStatus(newStatus);
        addLog(`Status updated to ${newStatus}`);
    };

    const completeSimulation = () => {
        setShowSummary(true);
        addLog('Simulation completed', 'All steps finished successfully');
    };

    const restartSimulation = () => {
        setIsStarted(false);
        setCurrentStep(0);
        setJobStatus('PENDING');
        setShowJobModal(false);
        setShowSummary(false);
        logger.clear();
        setLogs([]);
    };

    const stepIcons = [Home, LayoutDashboard, Package, Truck, Bell, Award];
    const StepIcon = stepIcons[currentStep] || Package;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-700 via-accent-600 to-cta-600 rounded-2xl p-8 mb-8 text-white">
                <h1 className="text-3xl font-bold mb-2">🚚 Delivery Workflow Simulation</h1>
                <p className="text-blue-100">
                    Experience a complete delivery journey from creation to completion
                </p>
            </div>

            {!isStarted ? (
                /* Welcome Screen */
                <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-12 text-center">
                    <div className="w-20 h-20 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Package className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-neutral-900 mb-4">
                        Welcome to the Delivery Simulation
                    </h2>
                    <p className="text-neutral-600 max-w-2xl mx-auto mb-8">
                        This guided simulation will walk you through a complete delivery workflow as a real user.
                        You&apos;ll experience job creation, status tracking, notifications, and completion.
                        All data is mock and isolated from production.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 max-w-2xl mx-auto">
                        <h3 className="font-semibold text-blue-900 mb-3">What you&apos;ll experience:</h3>
                        <ul className="text-left text-sm text-blue-800 space-y-2">
                            {deliveryWorkflowSteps.map((step, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <span><strong>Step {i + 1}:</strong> {step.title}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <button
                        onClick={startSimulation}
                        className="bg-primary-700 hover:bg-primary-800 text-white font-semibold px-8 py-4 rounded-lg shadow-lg transition-colors flex items-center gap-2 mx-auto"
                    >
                        <Play className="w-5 h-5" />
                        Start Simulation
                    </button>
                </div>
            ) : (
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Progress */}
                        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-neutral-900">Progress</h3>
                                <span className="text-sm text-neutral-600">
                                    Step {currentStep + 1} of {deliveryWorkflowSteps.length}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {deliveryWorkflowSteps.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`flex-1 h-2 rounded-full transition-colors ${i <= currentStep ? 'bg-primary-600' : 'bg-neutral-200'
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Current Step */}
                        <div className="bg-white rounded-xl shadow-sm border-2 border-primary-300 p-8">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 bg-primary-100 text-primary-700 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <StepIcon className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-sm font-medium text-primary-700">
                                            Step {currentStep + 1}
                                        </span>
                                    </div>
                                    <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                                        {currentStepData.title}
                                    </h2>
                                    <p className="text-neutral-600">{currentStepData.description}</p>
                                </div>
                            </div>

                            {/* Highlights */}
                            {currentStepData.highlights && (
                                <div className="bg-accent-50 border border-accent-200 rounded-lg p-4 mb-6">
                                    <h4 className="font-semibold text-accent-900 mb-2 text-sm">Key Elements:</h4>
                                    <ul className="space-y-1">
                                        {currentStepData.highlights.map((highlight, i) => (
                                            <li key={i} className="text-sm text-accent-800 flex items-center gap-2">
                                                <ArrowRight className="w-3 h-3" />
                                                {highlight}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="space-y-3">
                                {currentStep === 0 && (
                                    <button
                                        onClick={() => goToRoute('/')}
                                        className="w-full bg-primary-700 hover:bg-primary-800 text-white font-semibold px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        Go to Home Page
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                )}

                                {currentStep === 1 && (
                                    <button
                                        onClick={() => goToRoute('/dashboard')}
                                        className="w-full bg-primary-700 hover:bg-primary-800 text-white font-semibold px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        Go to Dashboard
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                )}

                                {currentStep === 2 && (
                                    <button
                                        onClick={simulateJobCreation}
                                        className="w-full bg-accent-600 hover:bg-accent-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Package className="w-5 h-5" />
                                        Create Delivery Request
                                    </button>
                                )}

                                {currentStep === 3 && (
                                    <div className="space-y-2">
                                        <button
                                            onClick={() => updateJobStatus('ACCEPTED')}
                                            disabled={jobStatus !== 'PENDING'}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            1. Accept Delivery (PENDING → ACCEPTED)
                                        </button>
                                        <button
                                            onClick={() => updateJobStatus('IN_PROGRESS')}
                                            disabled={jobStatus !== 'ACCEPTED'}
                                            className="w-full bg-accent-600 hover:bg-accent-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            2. Start Transport (ACCEPTED → IN_PROGRESS)
                                        </button>
                                        <button
                                            onClick={() => updateJobStatus('COMPLETED')}
                                            disabled={jobStatus !== 'IN_PROGRESS'}
                                            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            3. Complete Delivery (IN_PROGRESS → COMPLETED)
                                        </button>
                                        {jobStatus === 'COMPLETED' && (
                                            <button
                                                onClick={nextStep}
                                                className="w-full bg-primary-700 hover:bg-primary-800 text-white font-semibold px-6 py-3 rounded-lg transition-colors mt-4"
                                            >
                                                Continue to Notifications
                                                <ArrowRight className="w-5 h-5 inline ml-2" />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {currentStep === 4 && (
                                    <button
                                        onClick={nextStep}
                                        className="w-full bg-primary-700 hover:bg-primary-800 text-white font-semibold px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        Review Notifications
                                        <Bell className="w-5 h-5" />
                                    </button>
                                )}

                                {currentStep === 5 && (
                                    <button
                                        onClick={completeSimulation}
                                        className="w-full bg-accent-600 hover:bg-accent-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        View Completion Summary
                                        <Award className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Job Status Indicator */}
                        {currentStep >= 3 && (
                            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                                <h3 className="font-bold text-neutral-900 mb-4">Current Job Status</h3>
                                <div className="flex items-center gap-3">
                                    <div className={`px-4 py-2 rounded-lg font-medium ${jobStatus === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                                        jobStatus === 'ACCEPTED' ? 'bg-blue-100 text-blue-700' :
                                            jobStatus === 'IN_PROGRESS' ? 'bg-accent-100 text-accent-700' :
                                                'bg-green-100 text-green-700'
                                        }`}>
                                        {jobStatus}
                                    </div>
                                    <span className="text-sm text-neutral-600">
                                        Tunis Centre → Sousse Ville (120 TND)
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Logs */}
                        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                            <h3 className="font-bold text-neutral-900 mb-4">Activity Log</h3>
                            <div className="bg-neutral-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-xs">
                                {logs.length === 0 ? (
                                    <p className="text-neutral-500">No activity yet...</p>
                                ) : (
                                    logs.map((log, i) => (
                                        <div key={i} className="text-accent-400 mb-1">
                                            {log}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                            <h3 className="font-bold text-neutral-900 mb-4">Controls</h3>
                            <button
                                onClick={restartSimulation}
                                className="w-full flex items-center justify-center gap-2 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 font-medium px-4 py-2 rounded-lg transition-colors"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Restart Simulation
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Job Creation Modal */}
            {showJobModal && (
                <div className="fixed inset-0 bg-black/50 z-modal-backdrop flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-neutral-900 mb-4">Create Delivery Request</h3>
                        <div className="space-y-4 mb-6">
                            <div className="flex items-center gap-3">
                                <Package className="w-5 h-5 text-accent-600" />
                                <div>
                                    <p className="text-sm text-neutral-500">Pickup</p>
                                    <p className="font-semibold text-neutral-900">Tunis Centre</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <MapPin className="w-5 h-5 text-cta-600" />
                                <div>
                                    <p className="text-sm text-neutral-500">Delivery</p>
                                    <p className="font-semibold text-neutral-900">Sousse Ville</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <TrendingUp className="w-5 h-5 text-primary-600" />
                                <div>
                                    <p className="text-sm text-neutral-500">Price</p>
                                    <p className="font-semibold text-neutral-900">120 TND</p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={confirmJobCreation}
                            className="w-full bg-primary-700 hover:bg-primary-800 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                        >
                            Confirm Creation (Mock)
                        </button>
                    </div>
                </div>
            )}

            {/* Summary Modal */}
            {showSummary && (
                <div className="fixed inset-0 bg-black/50 z-modal-backdrop flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-8">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-accent-100 text-accent-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-bold text-neutral-900 mb-2">
                                Delivery Completed! 🎉
                            </h3>
                            <p className="text-neutral-600">
                                You&apos;ve successfully completed the delivery workflow simulation
                            </p>
                        </div>

                        <div className="bg-neutral-50 rounded-lg p-6 mb-6 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-neutral-700">Delivery Status</span>
                                <span className="font-semibold text-green-700">✓ Completed</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-neutral-700">Trust Score</span>
                                <span className="font-semibold text-primary-700">88/100 (+3)</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-neutral-700">Notifications Sent</span>
                                <span className="font-semibold text-neutral-900">5</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-neutral-700">Payment</span>
                                <span className="font-semibold text-accent-700">Released (120 TND)</span>
                            </div>
                        </div>

                        <button
                            onClick={restartSimulation}
                            className="w-full bg-primary-700 hover:bg-primary-800 text-white font-semibold px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <RotateCcw className="w-5 h-5" />
                            Restart Simulation
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
