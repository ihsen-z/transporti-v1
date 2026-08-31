"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin, Pencil, Trash2, Plus } from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";
import { GOVERNORATES } from "@/lib/governorates";
import {
  getAdresses,
  creerAdresse,
  modifierAdresse,
  supprimerAdresse,
  type AdresseEnregistree,
} from "@/lib/services/addresses";

/** Doit rester égal à `SavedAddress.MAXIMUM_PAR_UTILISATEUR` côté backend. */
const MAXIMUM = 20;

interface Brouillon {
  id: number | null;
  label: string;
  address: string;
  governorate: string;
}

const BROUILLON_VIDE: Brouillon = {
  id: null,
  label: "",
  address: "",
  governorate: "",
};

/**
 * C5.9 — la gestion du carnet d'adresses.
 *
 * Le formulaire ne propose PAS de saisir des coordonnées : personne ne connaît
 * sa latitude. Une adresse créée ici n'a donc que son gouvernorat, ce qui
 * suffit — l'estimation de prix retombe alors sur les centroïdes, exactement
 * comme pour un trajet retour saisi par corridor. Les coordonnées d'une adresse
 * réutilisée depuis un formulaire de publication sont préservées telles quelles.
 */
export function AddressBookManager() {
  const { t } = useAppI18n();
  const a = t.addressBook;

  const [adresses, setAdresses] = useState<AdresseEnregistree[] | null>(null);
  const [erreurLecture, setErreurLecture] = useState(false);
  const [brouillon, setBrouillon] = useState<Brouillon | null>(null);
  const [erreurEcriture, setErreurEcriture] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const relire = useCallback(async () => {
    setErreurLecture(false);
    try {
      setAdresses(await getAdresses());
    } catch {
      // On remonte l'échec au lieu de rendre une liste vide : « carnet vide »
      // et « lecture impossible » ne veulent pas dire la même chose, et
      // confondre les deux ferait recréer des adresses déjà enregistrées.
      setAdresses(null);
      setErreurLecture(true);
    }
  }, []);

  useEffect(() => {
    void relire();
  }, [relire]);

  const enregistrer = async () => {
    if (!brouillon) return;
    setEnCours(true);
    setErreurEcriture(null);
    try {
      const champs = {
        label: brouillon.label.trim(),
        address: brouillon.address.trim(),
        governorate: brouillon.governorate,
      };
      if (brouillon.id === null) await creerAdresse(champs);
      else await modifierAdresse(brouillon.id, champs);
      setBrouillon(null);
      await relire();
    } catch {
      // Le backend refuse un nom en double et le dépassement du plafond avec
      // un message précis ; on n'essaie pas de le deviner ici, mais on dit que
      // l'enregistrement a échoué plutôt que de fermer le formulaire comme si
      // tout allait bien.
      setErreurEcriture(a.saveError);
    } finally {
      setEnCours(false);
    }
  };

  const retirer = async (adresse: AdresseEnregistree) => {
    if (!window.confirm(interpolate(a.confirmRemove, { label: adresse.label })))
      return;
    await supprimerAdresse(adresse.id);
    await relire();
  };

  if (erreurLecture) {
    return (
      <div role="alert" data-testid="carnet-erreur" className="p-6 text-center">
        <p className="text-neutral-900 font-medium">{a.loadError}</p>
        <button
          onClick={() => void relire()}
          className="mt-3 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium"
        >
          {a.retry}
        </button>
      </div>
    );
  }

  if (adresses === null) {
    return (
      <p data-testid="carnet-chargement" className="p-6 text-neutral-500">
        {t.common.loading}
      </p>
    );
  }

  const plein = adresses.length >= MAXIMUM;

  return (
    <div data-testid="carnet-adresses">
      <p className="text-sm text-neutral-500 mb-4">{a.subtitle}</p>

      {adresses.length === 0 ? (
        <div
          data-testid="carnet-vide"
          className="rounded-xl border border-dashed border-neutral-300 p-8 text-center"
        >
          <MapPin className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
          <p className="font-medium text-neutral-900">{a.empty}</p>
          <p className="text-sm text-neutral-500 mt-1">{a.emptyHint}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {adresses.map((adresse) => (
            <li
              key={adresse.id}
              data-testid={`carnet-ligne-${adresse.id}`}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 p-4"
            >
              <MapPin className="w-5 h-5 text-brand-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-neutral-900 truncate">
                  {adresse.label}
                </p>
                <p className="text-sm text-neutral-500 truncate">
                  {adresse.address} · {adresse.governorate}
                </p>
              </div>
              <button
                type="button"
                data-testid={`carnet-modifier-${adresse.id}`}
                onClick={() =>
                  setBrouillon({
                    id: adresse.id,
                    label: adresse.label,
                    address: adresse.address,
                    governorate: adresse.governorate,
                  })
                }
                aria-label={a.edit}
                className="p-2 text-neutral-400 hover:text-brand-600"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                data-testid={`carnet-supprimer-${adresse.id}`}
                onClick={() => void retirer(adresse)}
                aria-label={a.remove}
                className="p-2 text-neutral-400 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Le plafond est ANNONCE avant d'etre atteint, et non decouvert par un
          refus au moment d'enregistrer. */}
      {plein ? (
        <p data-testid="carnet-plein" className="mt-4 text-sm text-amber-700">
          {interpolate(a.limitReached, { max: MAXIMUM })}
        </p>
      ) : brouillon === null ? (
        <button
          type="button"
          data-testid="carnet-ajouter"
          onClick={() => setBrouillon(BROUILLON_VIDE)}
          className="mt-4 inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-medium px-4 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          {a.add}
        </button>
      ) : null}

      {brouillon !== null && (
        <div className="mt-4 rounded-xl border border-neutral-200 p-4 space-y-3">
          <div>
            <label className="block text-sm text-neutral-600 mb-1">
              {a.labelField}
            </label>
            <input
              data-testid="carnet-champ-nom"
              value={brouillon.label}
              onChange={(e) =>
                setBrouillon({ ...brouillon, label: e.target.value })
              }
              placeholder={a.labelPlaceholder}
              className="w-full p-3 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">
              {a.addressField}
            </label>
            <input
              data-testid="carnet-champ-adresse"
              value={brouillon.address}
              onChange={(e) =>
                setBrouillon({ ...brouillon, address: e.target.value })
              }
              placeholder={a.addressPlaceholder}
              className="w-full p-3 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">
              {a.governorateField}
            </label>
            <select
              data-testid="carnet-champ-gouvernorat"
              value={brouillon.governorate}
              onChange={(e) =>
                setBrouillon({ ...brouillon, governorate: e.target.value })
              }
              className="w-full p-3 border rounded-lg"
            >
              <option value="">—</option>
              {GOVERNORATES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {erreurEcriture && (
            <p
              data-testid="carnet-erreur-ecriture"
              className="text-sm text-red-600"
            >
              {erreurEcriture}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              data-testid="carnet-enregistrer"
              onClick={() => void enregistrer()}
              disabled={
                enCours ||
                !brouillon.label.trim() ||
                !brouillon.address.trim() ||
                !brouillon.governorate
              }
              className="bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-medium px-4 py-2 rounded-lg"
            >
              {a.save}
            </button>
            <button
              type="button"
              data-testid="carnet-annuler"
              onClick={() => {
                setBrouillon(null);
                setErreurEcriture(null);
              }}
              className="text-neutral-600 hover:text-neutral-900 font-medium px-4 py-2"
            >
              {a.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
