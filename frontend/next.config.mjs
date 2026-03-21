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
};

export default nextConfig;
