/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        // Warning: ignoring lint errors for production simulation
        ignoreDuringBuilds: true,
    },
    typescript: {
        // Warning: ignoring TS errors for production simulation
        ignoreBuildErrors: true,
    },
    optimizeFonts: false,
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
        ],
    },
};

export default nextConfig;
