/** @type {import('next').NextConfig} */
const nextConfig = {
    // Renommage des routes du 26/08/2026 (lot 0.2 du plan de mise a niveau).
    // L'URL fait partie de l'architecture de l'information : « jobs » ne dit rien
    // a un utilisateur. Ces redirections permanentes preservent les liens
    // existants et les favoris. A conserver au moins six mois.
    // Voir docs/PLAN_ACTION_MISE_A_NIVEAU_WEB_2026-08-26.md
    async redirects() {
        return [
            { source: '/jobs/return-trips', destination: '/recherche', permanent: true },
            { source: '/jobs/return-trip', destination: '/retours/nouveau', permanent: true },
            { source: '/jobs/browse', destination: '/demandes', permanent: true },
            { source: '/jobs/new', destination: '/demandes/nouvelle', permanent: true },
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
