"use client";

import { Button } from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Input";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import type { JobDetail } from "@/lib/types/jobs";

/** Les quatre confirmations de l'ecran. `null` = aucune ouverte. */
export type DialogueDetailTransport =
  | "confirmDelivery"
  | "cancelJob"
  | "markDelivered"
  | "transporterCancel"
  | null;

interface Props {
  dialogueOuvert: DialogueDetailTransport;
  job: JobDetail;
  codeLivraison: string;
  motifAnnulation: string;
  confirmationEnCours: boolean;
  annulationEnCours: boolean;
  livraisonEnCours: boolean;
  annulationTransporteurEnCours: boolean;
  onCodeChange: (valeur: string) => void;
  /** Le champ fichier est NON controle, comme dans l'original : seule la
   *  page retient le fichier choisi, pour l'envoyer a la validation. */
  onPhotoChange: (fichier: File | null) => void;
  onMotifChange: (valeur: string) => void;
  onFermer: () => void;
  onConfirmerReception: () => void;
  onAnnulerLeTransport: () => void;
  onMarquerLivre: () => void;
  onAnnulerCoteTransporteur: () => void;
}

/**
 * Les quatre confirmations de l'ecran de detail — lot 4.1.
 *
 * Elles remplacent `window.confirm()` et `window.prompt()`, qui n'etaient ni
 * styles, ni traduits, et limitaient un motif d'annulation a une ligne.
 *
 * Extraites de `jobs/[id]/page.tsx`, ou elles fermaient le fichier sur cent
 * quinze lignes de balisage sans rapport avec le reste du rendu.
 *
 * Composant CONTROLE : aucun etat, aucun appel reseau. La page decide quand
 * ouvrir et quoi faire de la confirmation.
 */
export function JobDetailDialogs({
  dialogueOuvert,
  job,
  codeLivraison,
  motifAnnulation,
  confirmationEnCours,
  annulationEnCours,
  livraisonEnCours,
  annulationTransporteurEnCours,
  onCodeChange,
  onPhotoChange,
  onMotifChange,
  onFermer,
  onConfirmerReception,
  onAnnulerLeTransport,
  onMarquerLivre,
  onAnnulerCoteTransporteur,
}: Props) {
  const { t } = useAppI18n();

  return (
    <>
      <ConfirmModal
        open={dialogueOuvert === "confirmDelivery"}
        title={t.jobDetail.confirmReceptionTitle}
        message={t.jobDetail.confirmReceptionMsg}
        confirmLabel={t.jobDetail.confirmReceptionLabel}
        confirmColor="brand"
        loading={confirmationEnCours}
        onConfirm={onConfirmerReception}
        onCancel={() => onFermer()}
      />

      <ConfirmModal
        open={dialogueOuvert === "cancelJob"}
        title={t.jobDetail.cancelJobTitle}
        message={t.jobDetail.cancelJobMsg}
        confirmLabel={t.jobDetail.cancelJobLabel}
        cancelLabel={t.jobDetail.backLabel}
        confirmColor="red"
        loading={annulationEnCours}
        onConfirm={onAnnulerLeTransport}
        onCancel={() => onFermer()}
      />

      <ConfirmModal
        open={dialogueOuvert === "markDelivered"}
        title={t.jobDetail.markDeliveredTitle}
        message={t.jobDetail.markDeliveredMsg}
        confirmLabel={t.jobDetail.markDeliveredLabel}
        confirmColor="brand"
        loading={livraisonEnCours}
        onConfirm={onMarquerLivre}
        onCancel={() => onFermer()}
        detail={
          <div className="flex flex-col gap-3 text-start">
            {job?.booking_payment_method && (
              <div>
                <label className="label mb-[7px]">
                  {t.jobDetail.podPinInputLabel}
                </label>
                <input
                  inputMode="numeric"
                  maxLength={4}
                  value={codeLivraison}
                  onChange={(e) =>
                    onCodeChange(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  className="w-full px-3 py-2 border rounded-lg text-center text-lg tracking-[0.3em] font-bold focus:ring-2 focus:ring-brand-500"
                  placeholder="••••"
                />
              </div>
            )}
            <div>
              <label className="label mb-[7px]">
                {t.jobDetail.podPhotoLabel}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-neutral-500"
              />
            </div>
          </div>
        }
      />

      <Modal
        open={dialogueOuvert === "transporterCancel"}
        title={t.jobDetail.cancelJobTitle}
        onClose={() => {
          onFermer();
          onMotifChange("");
        }}
        closeDisabled={annulationTransporteurEnCours}
        footer={
          <>
            <Button
              variant="outline"
              fullWidth
              disabled={annulationTransporteurEnCours}
              onClick={() => {
                onFermer();
                onMotifChange("");
              }}
            >
              {t.jobDetail.backLabel}
            </Button>
            <Button
              variant="danger"
              fullWidth
              loading={annulationTransporteurEnCours}
              loadingLabel={t.jobDetail.cancelling}
              disabled={!motifAnnulation.trim()}
              onClick={onAnnulerCoteTransporteur}
            >
              {t.jobDetail.cancelJobLabel}
            </Button>
          </>
        }
      >
        <p className="text-sm text-neutral-500 mb-4">
          {t.jobDetail.transporterCancelBody}
        </p>
        <Textarea
          label={t.jobDetail.cancelReasonLabel}
          required
          rows={3}
          value={motifAnnulation}
          onChange={(e) => onMotifChange(e.target.value)}
          placeholder={t.jobDetail.cancelReasonPlaceholder}
        />
      </Modal>
    </>
  );
}
