import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 text-white overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-5xl font-bold mb-6 leading-tight">
                  La logistique réinventée.
                  <br />
                  <span className="text-accent-400">Simple, rapide, fiable.</span>
                </h1>
                <p className="text-xl text-primary-100 mb-8">
                  Connectez-vous avec des transporteurs professionnels en Tunisie.
                  Envoyez vos colis en toute confiance.
                </p>
                <div className="flex gap-4">
                  <Link
                    href="/register"
                    className="bg-cta-500 hover:bg-cta-600 text-white font-semibold px-8 py-3 rounded-lg shadow-lg transition-all hover:scale-105"
                  >
                    Créer un compte
                  </Link>
                  <Link
                    href="/login"
                    className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold px-8 py-3 rounded-lg border border-white/30 transition-colors"
                  >
                    Se connecter
                  </Link>
                </div>
              </div>

              <div className="hidden md:block">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent-400 to-primary-500 rounded-2xl transform rotate-3"></div>
                  <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 transform -rotate-1 animate-float">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 bg-white/20 rounded-lg p-4">
                        <div className="w-12 h-12 bg-accent-500 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-semibold">Envoi sécurisé</div>
                          <div className="text-sm text-primary-100">Paiement protégé</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-white/20 rounded-lg p-4">
                        <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-semibold">Suivi en temps réel</div>
                          <div className="text-sm text-primary-100">Localisation GPS</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-neutral-900 mb-4">
                Pourquoi choisir Transporti V1 ?
              </h2>
              <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
                Une plateforme moderne qui simplifie la logistique pour tous
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-8 hover-lift">
                <div className="w-14 h-14 bg-primary-700 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-3">Paiement sécurisé</h3>
                <p className="text-neutral-700">
                  Système d&apos;escrow intégré. Votre argent est protégé jusqu&apos;à la livraison confirmée.
                </p>
              </div>

              <div className="bg-gradient-to-br from-accent-50 to-accent-100 rounded-xl p-8 hover-lift">
                <div className="w-14 h-14 bg-accent-600 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-3">Suivi en direct</h3>
                <p className="text-neutral-700">
                  Suivez votre colis en temps réel avec la géolocalisation GPS de nos transporteurs.
                </p>
              </div>

              <div className="bg-gradient-to-br from-cta-50 to-cta-100 rounded-xl p-8 hover-lift">
                <div className="w-14 h-14 bg-cta-600 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-3">Livraison rapide</h3>
                <p className="text-neutral-700">
                  Réseau de transporteurs professionnels pour des livraisons rapides et fiables.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-primary-700 to-primary-900">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-white mb-6">
              Prêt à commencer ?
            </h2>
            <p className="text-xl text-primary-100 mb-8">
              Rejoignez des milliers d&apos;utilisateurs qui font confiance à Transporti V1
            </p>
            <Link
              href="/register"
              className="inline-block bg-cta-500 hover:bg-cta-600 text-white font-semibold px-10 py-4 rounded-lg shadow-xl text-lg transition-all hover:scale-105"
            >
              Créer un compte gratuitement
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
