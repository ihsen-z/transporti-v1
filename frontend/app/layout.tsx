import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ToastProvider } from "@/components/ui/Toast";

import { AppI18nProvider } from "@/lib/i18n/useAppI18n";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Transporti — La logistique réinventée",
    template: "%s | Transporti",
  },
  description:
    "Plateforme de transport en Tunisie. Trouvez un transporteur fiable en quelques clics. Simple, rapide, sécurisé.",
  keywords: [
    "transport",
    "Tunisie",
    "logistique",
    "déménagement",
    "livraison",
    "transporteur",
  ],
  openGraph: {
    type: "website",
    locale: "fr_TN",
    siteName: "Transporti",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/images/logo.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/images/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <AppI18nProvider>
          <AuthProvider>
            <NotificationProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </NotificationProvider>
          </AuthProvider>
        </AppI18nProvider>
      </body>
    </html>
  );
}
