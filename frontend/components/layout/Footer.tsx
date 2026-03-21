import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-neutral-900 text-white mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="col-span-1">
                        <h3 className="text-lg font-bold mb-4">Transporti V1</h3>
                        <p className="text-neutral-400 text-sm">
                            La logistique réinventée. Simple, rapide, fiable.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Services</h4>
                        <ul className="space-y-2 text-sm text-neutral-400">
                            <li><Link href="/register" className="hover:text-white transition-colors">Transport de colis</Link></li>
                            <li><Link href="/register" className="hover:text-white transition-colors">Transport de marchandises</Link></li>
                            <li><Link href="/register" className="hover:text-white transition-colors">Suivi en temps réel</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Entreprise</h4>
                        <ul className="space-y-2 text-sm text-neutral-400">
                            <li><Link href="/help" className="hover:text-white transition-colors">À propos</Link></li>
                            <li><Link href="/register" className="hover:text-white transition-colors">Devenir transporteur</Link></li>
                            <li><Link href="/help" className="hover:text-white transition-colors">Contact</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Légal</h4>
                        <ul className="space-y-2 text-sm text-neutral-400">
                            <li><Link href="/terms" className="hover:text-white transition-colors">Conditions d&apos;utilisation</Link></li>
                            <li><Link href="/privacy" className="hover:text-white transition-colors">Politique de confidentialité</Link></li>
                            <li><Link href="/disputes" className="hover:text-white transition-colors">Résolution de litiges</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-neutral-800 mt-8 pt-8 text-center text-sm text-neutral-400">
                    <p>&copy; {new Date().getFullYear()} Transporti V1. Tous droits réservés.</p>
                </div>
            </div>
        </footer>
    );
}
