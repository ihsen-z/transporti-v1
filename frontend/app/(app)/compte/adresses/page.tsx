"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { AddressBookManager } from "@/components/addresses/AddressBookManager";

/**
 * C5.9 — le carnet d'adresses.
 *
 * Sous `/compte` parce que c'est une préférence du compte, pas un écran de
 * parcours. La valeur ne se joue pas ici mais dans le formulaire de
 * publication, où `SavedAddressPicker` propose ces adresses au moment de la
 * saisie : cette page ne fait que les gérer.
 */
export default function AdressesPage() {
  const { t } = useAppI18n();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href="/compte"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand-600 mb-6"
      >
        <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" />
        {t.common.back}
      </Link>

      <AddressBookManager />
    </div>
  );
}
