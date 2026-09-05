/** @type {import('next').NextConfig} */
const nextConfig = {
    // Renommage des routes du 26/08/2026 (lot 0.2 du plan de mise a niveau).
    // L'URL fait partie de l'architecture de l'information : « jobs » ne dit rien
    // a un utilisateur. Ces redirections permanentes preservent les liens
    // existants et les favoris. A conserver au moins six mois.
    // Voir docs/PLAN_ACTION_MISE_A_NIVEAU_WEB_2026-08-26.md
    async redirects() {
        return [
            // Vague A - les quatre routes du pivot
            { source: '/jobs/return-trips', destination: '/recherche', permanent: true },
            { source: '/jobs/return-trip', destination: '/retours/nouveau', permanent: true },
            { source: '/jobs/browse', destination: '/demandes', permanent: true },
            { source: '/jobs/new', destination: '/demandes/nouvelle', permanent: true },

            // Vague B - le reste de l arborescence metier
            { source: '/offers', destination: '/mes-offres', permanent: true },
            { source: '/wallet', destination: '/portefeuille', permanent: true },
            { source: '/settings', destination: '/compte', permanent: true },
            { source: '/disputes', destination: '/litiges', permanent: true },
            { source: '/verification', destination: '/documents', permanent: true },
            { source: '/transporter/:id', destination: '/transporteur/:id', permanent: true },
            { source: '/booking/:jobId', destination: '/reservation/:jobId', permanent: true },

            // Pages legales, 05/09/2026. Les stubs vivaient sous app/(app)/,
            // donc derriere AuthGuard : un examinateur de store ne peut pas
            // creer de compte pour lire une politique de confidentialite, et
            // un lien de politique inaccessible est un motif de refus. Les
            // vraies pages sont publiques et portent les slugs vers lesquels
            // l'application mobile pointe deja (EXPO_PUBLIC_*_URL).
            { source: '/terms', destination: '/conditions', permanent: true },
            { source: '/privacy', destination: '/confidentialite', permanent: true },

            // /jobs et /jobs/[id] ne sont volontairement pas renommes : ils
            // portent deux roles (detail de trajet vu par un client, detail de
            // mission vu par un transporteur). Leur separation releve du lot 4.
        ];
    },

    optimizeFonts: false,
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: false,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '8000',
                pathname: '/media/**',
            },
            {
                protocol: 'https',
                hostname: '*.transporti.tn',
                pathname: '/media/**',
            },
            {
                protocol: 'https',
                hostname: '*.onrender.com',
                pathname: '/media/**',
            },
        ],
    },
};

export default nextConfig;
