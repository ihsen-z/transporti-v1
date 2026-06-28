// Runtime configuration for Transporti V1
// Production — real API data only

export const config = {
    /** Base URL for the Django backend API */
    API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',

    /** API request timeout in milliseconds */
    API_TIMEOUT: Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 10000,
};
