import { Truck, Shield, Clock, Users } from 'lucide-react';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex">
            {/* Left Brand Panel — visible on md+ only */}
            <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-primary-800 via-primary-900 to-indigo-900 p-12 flex-col justify-center items-center text-white relative overflow-hidden">
                {/* Background dots pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Ccircle cx='3' cy='3' r='1.5'/%3E%3C/g%3E%3C/svg%3E")`,
                    }} />
                </div>

                {/* Decorative gradient orbs */}
                <div className="absolute top-20 right-20 w-72 h-72 bg-accent-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-20 left-10 w-56 h-56 bg-primary-400/20 rounded-full blur-3xl" />

                <div className="relative z-10 max-w-md text-center">
                    {/* Logo */}
                    <div className="flex items-center justify-center gap-3 mb-8 animate-fade-in-up">
                        <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                            <Truck className="w-8 h-8 text-white" />
                        </div>
                        <div className="text-left">
                            <h1 className="text-2xl font-bold">Transporti V1</h1>
                            <p className="text-sm text-primary-200">La logistique réinventée</p>
                        </div>
                    </div>

                    {/* Tagline */}
                    <h2 className="text-3xl font-bold mb-4 animate-fade-in-up delay-100">
                        Simple, rapide,{' '}
                        <span className="text-accent-400">fiable.</span>
                    </h2>
                    <p className="text-primary-200 mb-10 animate-fade-in-up delay-200">
                        La plateforme de logistique qui connecte clients et transporteurs professionnels en Tunisie.
                    </p>

                    {/* Glass stats card */}
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-8 animate-fade-in-up delay-300">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-2xl font-bold">3,200+</div>
                                <div className="text-xs text-primary-200 mt-1">Clients</div>
                            </div>
                            <div className="border-x border-white/20">
                                <div className="text-2xl font-bold">500+</div>
                                <div className="text-xs text-primary-200 mt-1">Transporteurs</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold">24/7</div>
                                <div className="text-xs text-primary-200 mt-1">Support</div>
                            </div>
                        </div>
                    </div>

                    {/* Trust bullets */}
                    <div className="space-y-3">
                        {[
                            { icon: Shield, text: 'Paiement sécurisé par escrow' },
                            { icon: Clock, text: 'Livraison rapide et fiable' },
                            { icon: Users, text: 'Transporteurs vérifiés' },
                        ].map((item, i) => (
                            <div
                                key={i}
                                className={`flex items-center gap-3 text-sm text-primary-100 animate-fade-in-up`}
                                style={{ animationDelay: `${0.4 + i * 0.1}s` }}
                            >
                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                                    <item.icon className="w-4 h-4" />
                                </div>
                                {item.text}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Content Panel — existing login/register pages */}
            <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-primary-50 via-white to-accent-50">
                <div className="w-full max-w-md animate-fade-in">
                    {children}
                </div>
            </div>
        </div>
    );
}
