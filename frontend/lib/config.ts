// Runtime configuration for Transporti V1
// Production — real API data only

export const config = {
  API_BASE_URL:
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://transporti-v1.onrender.com"
      : "http://localhost:8000"),

  /**
   * API request timeout in milliseconds.
   * 60 s : l'instance Render gratuite met 30 à 60 s à se réveiller, et la
   * première requête échouait par abandon avec l'ancien délai de 10 s.
   */
  API_TIMEOUT: Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 60000,
};
