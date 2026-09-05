import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalPage,
  Section,
  Liste,
  Encadre,
  ARemplir,
} from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation",
  description:
    "Les règles d'usage de Transporti : rôle de la plateforme, engagements de chaque partie, prix et commissions, paiement, litiges et clôture de compte.",
};

export default function ConditionsPage() {
  return (
    <LegalPage
      titre="Conditions générales d'utilisation"
      chapeau="Ces conditions décrivent ce que Transporti fait, ce qu'il ne fait pas, et ce que chacun s'engage à respecter en utilisant la plateforme."
      maj={<ARemplir>date d&apos;entrée en vigueur</ARemplir>}
    >
      <Section id="objet" numero={1} titre="Objet et acceptation">
        <p>
          Transporti est une plateforme de mise en relation entre des personnes
          ayant un besoin de transport de marchandises en Tunisie et des
          transporteurs disposant d&apos;une capacité disponible, en particulier
          sur leurs trajets retour.
        </p>
        <p>
          Créer un compte, publier un trajet ou envoyer une demande vaut
          acceptation pleine et entière des présentes conditions. Si vous ne les
          acceptez pas, n&apos;utilisez pas la plateforme.
        </p>
        <p>
          La plateforme est exploitée par <ARemplir>raison sociale</ARemplir>,{" "}
          <ARemplir>forme juridique</ARemplir>, immatriculée au registre
          national des entreprises sous le numéro <ARemplir>RNE</ARemplir>,
          matricule fiscal <ARemplir>matricule fiscal</ARemplir>, dont le siège
          est situé <ARemplir>adresse du siège</ARemplir>.
        </p>
      </Section>

      <Section id="acces" numero={2} titre="Qui peut utiliser Transporti">
        <Liste>
          <li>
            Vous devez être majeur et juridiquement capable de contracter. La
            plateforme n&apos;est pas destinée aux mineurs.
          </li>
          <li>
            Un numéro de téléphone ne peut être rattaché qu&apos;à un seul
            compte, et une adresse e-mail à un seul compte.
          </li>
          <li>
            Vous choisissez un rôle à l&apos;inscription — client ou
            transporteur. Les fonctions accessibles en dépendent.
          </li>
          <li>
            Vous êtes responsable de la confidentialité de votre mot de passe et
            de tout ce qui se fait depuis votre compte.
          </li>
        </Liste>
      </Section>

      <Section
        id="role"
        numero={3}
        titre="Ce que Transporti est — et ce qu'il n'est pas"
      >
        <p>
          Transporti met en relation.{" "}
          <strong>Transporti n&apos;est pas transporteur</strong> et
          n&apos;exécute aucune mission : le contrat de transport se forme entre
          le client et le transporteur, qui en sont les seules parties.
        </p>
        <p>
          La plateforme n&apos;est ni commissionnaire de transport, ni assureur,
          ni dépositaire de la marchandise. Elle n&apos;en prend jamais
          possession et ne la manipule à aucun moment.
        </p>
        <Encadre titre="Ce dont Transporti répond, et ce dont il ne répond pas">
          <p>
            Transporti répond du bon fonctionnement de la plateforme, de la
            retenue des fonds jusqu&apos;à la confirmation de livraison, et du
            traitement des litiges qui lui sont soumis.
          </p>
          <p>
            Transporti ne répond pas de l&apos;exécution du transport lui-même :
            ponctualité, état de la marchandise à l&apos;arrivée, conformité du
            véhicule ou des autorisations du transporteur relèvent des parties
            au contrat.
          </p>
        </Encadre>
      </Section>

      <Section
        id="verification"
        numero={4}
        titre="Vérification des transporteurs"
      >
        <p>
          Un transporteur peut déposer des pièces justificatives pour faire
          vérifier son compte : carte d&apos;identité nationale, permis de
          conduire, carte grise, attestation d&apos;assurance, et un selfie
          tenant sa pièce d&apos;identité.
        </p>
        <p>
          La mention «&nbsp;vérifié&nbsp;» signifie que ces pièces ont été
          reçues et contrôlées par nos équipes à la date de leur examen. Elle ne
          constitue ni une garantie de la qualité d&apos;une prestation, ni une
          caution des engagements pris par le transporteur, ni une vérification
          permanente : une assurance peut expirer après son contrôle.
        </p>
        <p>
          Fournir un document falsifié ou appartenant à un tiers entraîne la
          suspension immédiate du compte, sans préjudice des poursuites.
        </p>
      </Section>

      <Section id="mission" numero={5} titre="Comment une mission se forme">
        <Liste>
          <li>
            <strong>Le transporteur publie un retour</strong> : un corridor
            (départ, arrivée), une date, une capacité disponible et une
            fourchette de prix indicative.
          </li>
          <li>
            <strong>Le client cherche et envoie une demande</strong> décrivant
            sa marchandise — nature, poids, volume, photos, adresse de retrait,
            créneau — et propose un prix.
          </li>
          <li>
            <strong>Le transporteur accepte, refuse ou contre-propose.</strong>{" "}
            L&apos;accord des deux parties sur un prix forme le contrat de
            transport entre elles.
          </li>
        </Liste>
        <p>
          Une demande dont le poids dépasse la capacité annoncée par le
          transporteur est refusée automatiquement : mieux vaut le savoir à
          l&apos;envoi qu&apos;au chargement.
        </p>
      </Section>

      <Section id="prix" numero={6} titre="Prix, commission et paiement">
        <p>
          Le prix est celui convenu entre le client et le transporteur. Le
          client paie ce prix&nbsp;; Transporti prélève une commission sur la
          somme revenant au transporteur.
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
            affiché avant qu&apos;il n&apos;accepte. Aucune commission
            n&apos;est prélevée sur une mission qui n&apos;aboutit pas.
          </p>
        </Encadre>
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
            <strong>limité à 300&nbsp;TND</strong> par mission. La commission
            reste due à Transporti et devient une dette du transporteur, réglée
            sur ses gains.
          </li>
        </Liste>
        <p>
          Les paiements en ligne sont traités par un prestataire de paiement
          agréé. Transporti n&apos;a accès à aucune donnée de carte bancaire.
        </p>
      </Section>

      <Section
        id="livraison"
        numero={7}
        titre="Déroulé, code de livraison et preuve"
      >
        <p>
          Le transporteur confirme son départ, puis clôt la mission à la
          livraison. Pour clore une mission payée en ligne, il doit saisir un{" "}
          <strong>code de livraison à quatre chiffres</strong> que seul le
          client détient. Sans ce code, la mission ne peut pas être déclarée
          livrée.
        </p>
        <p>
          Le transporteur peut joindre une photo de la livraison. Elle est
          visible par le client dans le déroulé de la mission et sert de preuve
          en cas de contestation.
        </p>
        <p>
          La confirmation de réception par le client libère les fonds retenus
          vers le transporteur.
        </p>
      </Section>

      <Section id="annulation" numero={8} titre="Annulation">
        <p>
          Chaque partie peut annuler une mission tant qu&apos;elle n&apos;a pas
          été livrée, en indiquant un motif. Une annulation après acceptation,
          et a fortiori après le départ du transporteur, engage la
          responsabilité de son auteur envers l&apos;autre partie.
        </p>
        <p>
          Lorsque la somme est retenue par la plateforme, elle est restituée au
          client selon l&apos;issue du dossier, le cas échéant après examen
          d&apos;un litige.
        </p>
      </Section>

      <Section id="litiges" numero={9} titre="Litiges entre utilisateurs">
        <p>
          Chaque partie peut ouvrir un litige depuis la mission concernée.
          L&apos;ouverture d&apos;un litige <strong>gèle le versement</strong>{" "}
          des fonds retenus jusqu&apos;à sa résolution.
        </p>
        <p>
          Nos équipes examinent les éléments fournis par les deux parties —
          messages, photos, jalons de la mission — et décident de la répartition
          des fonds retenus. Cette décision porte sur les seules sommes détenues
          par la plateforme et ne préjuge pas des droits que chacun peut faire
          valoir devant les tribunaux.
        </p>
      </Section>

      <Section id="avis" numero={10} titre="Avis et réputation">
        <p>
          Un avis ne peut être déposé qu&apos;après une mission terminée, par
          une partie à cette mission. Il doit être sincère et se rapporter à la
          prestation.
        </p>
        <p>
          Nous pouvons masquer un avis injurieux, diffamatoire, sans rapport
          avec la prestation, ou déposé dans le but de nuire. Nous ne supprimons
          pas un avis négatif au seul motif qu&apos;il est négatif.
        </p>
      </Section>

      <Section id="contenus" numero={11} titre="Contenus que vous publiez">
        <p>
          Vous restez propriétaire des textes et photos que vous publiez. Vous
          nous accordez le droit de les héberger et de les afficher sur la
          plateforme, dans la seule mesure nécessaire au service — montrer votre
          marchandise au transporteur concerné, votre preuve de livraison au
          client concerné.
        </p>
        <p>
          Vous garantissez disposer des droits sur ce que vous publiez et ne pas
          photographier de personnes identifiables sans leur accord.
        </p>
      </Section>

      <Section id="interdits" numero={12} titre="Ce qui est interdit">
        <Liste>
          <li>
            Transporter des marchandises illicites, dangereuses, ou dont le
            transport requiert une autorisation dont vous ne disposez pas.
          </li>
          <li>
            Contourner la plateforme pour éviter la commission alors que la mise
            en relation s&apos;y est faite.
          </li>
          <li>
            Créer plusieurs comptes, usurper une identité, ou utiliser le compte
            d&apos;autrui.
          </li>
          <li>
            Publier de fausses annonces, de faux avis, ou des informations
            trompeuses sur un véhicule ou une capacité.
          </li>
          <li>
            Harceler, menacer ou injurier un autre utilisateur, y compris par la
            messagerie.
          </li>
          <li>
            Extraire automatiquement les données de la plateforme, ou tenter
            d&apos;en perturber le fonctionnement.
          </li>
        </Liste>
      </Section>

      <Section id="suspension" numero={13} titre="Suspension et clôture">
        <p>
          Nous pouvons suspendre un compte qui contrevient aux présentes
          conditions, le temps d&apos;examiner la situation, et le fermer en cas
          de manquement grave ou répété.
        </p>
        <p>
          Vous pouvez fermer votre compte à tout moment depuis
          l&apos;application. La clôture est refusée tant qu&apos;une mission
          est en cours ou qu&apos;un litige est ouvert : de l&apos;argent ou une
          marchandise est engagé, et l&apos;autre partie a besoin d&apos;un
          interlocuteur. Le traitement de vos données après clôture est décrit
          dans la{" "}
          <Link href="/confidentialite" className="text-primary-600 underline">
            politique de confidentialité
          </Link>
          .
        </p>
      </Section>

      <Section id="propriete" numero={14} titre="Propriété intellectuelle">
        <p>
          La plateforme, sa marque, ses textes et son interface sont protégés.
          Leur usage en dehors de l&apos;utilisation normale du service requiert
          notre accord écrit.
        </p>
      </Section>

      <Section
        id="modification"
        numero={15}
        titre="Modification des conditions"
      >
        <p>
          Nous pouvons faire évoluer ces conditions. Toute modification
          substantielle vous sera signalée dans l&apos;application avant son
          entrée en vigueur. Continuer à utiliser la plateforme après cette date
          vaut acceptation.
        </p>
      </Section>

      <Section id="droit" numero={16} titre="Droit applicable et différends">
        <p>
          Les présentes conditions sont régies par le droit tunisien. En cas de
          différend avec Transporti, nous vous invitons à nous écrire
          d&apos;abord&nbsp;: la plupart se règlent ainsi. À défaut
          d&apos;accord, le litige relève des tribunaux compétents de{" "}
          <ARemplir>ville du ressort compétent</ARemplir>.
        </p>
      </Section>

      <Section id="contact" numero={17} titre="Nous écrire">
        <p>
          <ARemplir>adresse e-mail de contact</ARemplir> —{" "}
          <ARemplir>téléphone</ARemplir>
        </p>
      </Section>
    </LegalPage>
  );
}
