import { Section, Liste, Encadre } from "@/components/legal/LegalPage";
import type { PaymentConfig } from "@/lib/services/paymentConfig";

/** Montant en dinars, au format français (ex. « 1 500 »). */
function tnd(montant: number): string {
  return `${montant.toLocaleString("fr-FR")} TND`;
}

/**
 * Article 6 des conditions : prix, commission et paiement.
 *
 * Le texte suit le réglage du serveur : en mode « espèces seules », il ne
 * promet ni paiement en ligne ni séquestre, qui n'existent pas encore. Les
 * plafonds viennent aussi du serveur, pour ne jamais annoncer une valeur
 * périmée.
 */
export function SectionPrix({ config }: { config: PaymentConfig }) {
  const { cod_max_amount, commission_debt_limit, online_payment_enabled } =
    config;

  return (
    <Section id="prix" numero={6} titre="Prix, commission et paiement">
      <p>
        Le prix est celui convenu entre le client et le transporteur. Le client
        paie ce prix&nbsp;; Transporti prélève une commission sur la somme
        revenant au transporteur.
      </p>
      <Encadre titre="Taux de commission appliqués">
        <Liste>
          <li>
            <strong>8&nbsp;%</strong> sur une mission conclue via un trajet
            retour — taux réduit, parce que valoriser un retour à vide est la
            raison d&apos;être de la plateforme.
          </li>
          <li>
            <strong>12&nbsp;%</strong> sur une mission de transport de
            marchandise.
          </li>
          <li>
            <strong>15&nbsp;%</strong> sur un déménagement.
          </li>
        </Liste>
        <p>
          Le montant net revenant au transporteur, commission déduite, lui est
          affiché avant qu&apos;il n&apos;accepte. Aucune commission n&apos;est
          prélevée sur une mission qui n&apos;aboutit pas.
        </p>
      </Encadre>

      {online_payment_enabled ? (
        <>
          <p className="font-semibold text-neutral-900">
            Deux modes de paiement&nbsp;:
          </p>
          <Liste>
            <li>
              <strong>Paiement en ligne (séquestre).</strong> Le client règle à
              l&apos;acceptation. La somme est{" "}
              <strong>retenue par la plateforme</strong> et n&apos;est versée au
              transporteur qu&apos;après confirmation de la livraison par le
              client. C&apos;est ce qui protège les deux parties.
            </li>
            <li>
              <strong>Paiement à la livraison, en espèces.</strong> Le client
              règle directement le transporteur. Ce mode est{" "}
              <strong>limité à {tnd(cod_max_amount)}</strong> par mission. La
              commission reste due à Transporti et devient une dette du
              transporteur, réglée sur ses gains.
            </li>
          </Liste>
          <p>
            Les paiements en ligne sont traités par un prestataire de paiement
            agréé. Transporti n&apos;a accès à aucune donnée de carte bancaire.
          </p>
        </>
      ) : (
        <>
          <p>
            <strong>
              Le client règle le transporteur en espèces, à la livraison.
            </strong>{" "}
            Ce mode est <strong>limité à {tnd(cod_max_amount)}</strong> par
            mission. Le paiement en ligne n&apos;est pas encore
            disponible&nbsp;; ces conditions seront mises à jour avant son
            ouverture.
          </p>
          <p>
            L&apos;argent ne transite donc pas par Transporti. La commission de
            chaque mission livrée devient une{" "}
            <strong>dette du transporteur envers Transporti</strong>, affichée
            dans son espace «&nbsp;Gains&nbsp;». Il la règle à Transporti selon
            les moyens que Transporti lui indique&nbsp;; chaque règlement est
            enregistré et vient en déduction de sa dette.
          </p>
        </>
      )}

      {/* Le plafond de dette existe quel que soit le mode : il protège la
          commission des courses payées en espèces (payments/debt.py). */}
      <Encadre titre="Plafond de dette de commission">
        <p>
          Au-delà de <strong>{tnd(commission_debt_limit)}</strong> de commission
          due, le transporteur ne peut plus publier de retour, faire
          d&apos;offre ni accepter de demande, jusqu&apos;à ce qu&apos;un
          règlement ramène sa dette sous ce seuil. Les missions déjà engagées se
          poursuivent normalement, et le déblocage est immédiat après le
          règlement.
        </p>
      </Encadre>
    </Section>
  );
}
