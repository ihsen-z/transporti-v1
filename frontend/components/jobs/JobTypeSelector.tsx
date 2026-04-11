import React from "react";
import { Truck, Home } from "lucide-react";

interface JobTypeSelectorProps {
  selectedType: string | null;
  onSelect: (type: "TRANSPORT" | "MOVING") => void;
}

export function JobTypeSelector({
  selectedType,
  onSelect,
}: JobTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Transport Option */}
      <button
        type="button"
        onClick={() => onSelect("TRANSPORT")}
        className={`p-6 border-2 rounded-xl flex flex-col items-center gap-4 transition-all
          ${
            selectedType === "TRANSPORT"
              ? "border-brand-600 bg-brand-600/5 text-brand-800"
              : "border-neutral-200 hover:border-brand-600/30 hover:bg-neutral-50"
          }`}
      >
        <div
          className={`p-4 rounded-full ${selectedType === "TRANSPORT" ? "bg-brand-600/20" : "bg-neutral-100"}`}
        >
          <Truck className="w-8 h-8" />
        </div>
        <div className="text-center">
          <h3 className="font-bold text-lg">Transport de Marchandises</h3>
          <p className="text-sm text-neutral-500 mt-2">
            Pour vos colis, meubles, ou équipements. Idéal pour les livraisons
            rapides.
          </p>
        </div>
      </button>

      {/* Moving Option */}
      <button
        type="button"
        onClick={() => onSelect("MOVING")}
        className={`p-6 border-2 rounded-xl flex flex-col items-center gap-4 transition-all
          ${
            selectedType === "MOVING"
              ? "border-brand-600 bg-brand-600/5 text-brand-800"
              : "border-neutral-200 hover:border-brand-600/30 hover:bg-neutral-50"
          }`}
      >
        <div
          className={`p-4 rounded-full ${selectedType === "MOVING" ? "bg-brand-600/20" : "bg-neutral-100"}`}
        >
          <Home className="w-8 h-8" />
        </div>
        <div className="text-center">
          <h3 className="font-bold text-lg">Déménagement</h3>
          <p className="text-sm text-neutral-500 mt-2">
            Service complet pour changer de domicile. Inclus estimation du
            volume.
          </p>
        </div>
      </button>
    </div>
  );
}
