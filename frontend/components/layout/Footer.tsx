export default function Footer() {
    return (
        <footer className="bg-gray-900 text-white mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="col-span-1">
                        <h3 className="text-lg font-bold mb-4">Transporti V1</h3>
                        <p className="text-gray-400 text-sm">
                            La logistique réinventée. Simple, rapide, fiable.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Services</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><a href="#" className="hover:text-white">Transport de colis</a></li>
                            <li><a href="#" className="hover:text-white">Transport de marchandises</a></li>
                            <li><a href="#" className="hover:text-white">Suivi en temps réel</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Entreprise</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><a href="#" className="hover:text-white">À propos</a></li>
                            <li><a href="#" className="hover:text-white">Devenir transporteur</a></li>
                            <li><a href="#" className="hover:text-white">Contact</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Légal</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><a href="#" className="hover:text-white">Conditions d&apos;utilisation</a></li>
                            <li><a href="#" className="hover:text-white">Politique de confidentialité</a></li>
                            <li><a href="#" className="hover:text-white">Mentions légales</a></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
                    <p>&copy; {new Date().getFullYear()} Transporti V1. Tous droits réservés.</p>
                </div>
            </div>
        </footer>
    );
}
