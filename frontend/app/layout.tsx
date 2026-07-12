import type { Metadata } from "next";
import { Inter, Cairo } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ToastProvider } from "@/components/ui/Toast";

import { AppI18nProvider } from "@/lib/i18n/useAppI18n";

const inter = Inter({ subsets: ["latin"] });
const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-cairo",
});

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

// Pose lang/dir avant le premier paint selon la préférence localStorage, pour
// éviter le flash LTR chez les utilisateurs arabophones. Le serveur rend
// lang="fr" (langue par défaut) ; ce script corrige avant l'hydratation
// (d'où suppressHydrationWarning sur <html>).
const LOCALE_INIT_SCRIPT = `(function(){try{var l=localStorage.getItem("transporti-app-locale");if(l==="ar"){var d=document.documentElement;d.setAttribute("lang","ar");d.setAttribute("dir","rtl");}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LOCALE_INIT_SCRIPT }} />
      </head>
      <body className={`${inter.className} ${cairo.variable}`}>
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
