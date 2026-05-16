/** @type {import('next').NextConfig} */
const nextConfig = {
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
        ],
    },
};

export default nextConfig;
