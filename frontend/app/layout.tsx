import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";
import RoleSwitcher from "@/components/auth/RoleSwitcher";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Transporti V1 - La logistique réinventée",
  description: "Plateforme de transport en Tunisie. Simple, rapide, fiable.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <AuthProvider>
          <ToastProvider>
            {children}
            <RoleSwitcher />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
