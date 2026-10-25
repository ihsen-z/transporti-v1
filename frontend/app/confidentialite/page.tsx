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
  title: "Politique de confidentialité",
  description:
    "Quelles données Transporti collecte, pourquoi, qui y a accès, combien de temps elles sont conservées, et comment exercer vos droits.",
};

export default function ConfidentialitePage() {
  return (
    <LegalPage
      titre="Politique de confidentialité"
      chapeau="Ce document décrit les données que Transporti collecte, ce que nous en faisons, qui y a accès et pendant combien de temps. Il est écrit pour être lu, pas pour être survolé."
      maj={<ARemplir>date d&apos;entrée en vigueur</ARemplir>}
    >
      <Section id="responsable" numero={1} titre="Qui traite vos données">
        <p>
          Le responsable du traitement est <ARemplir>raison sociale</ARemplir>,
          dont le siège est situé <ARemplir>adresse du siège</ARemplir>.
        </p>
        <p>
          Pour toute question sur vos données ou pour exercer vos droits&nbsp;:{" "}
          <ARemplir>adresse e-mail dédiée aux données personnelles</ARemplir>.
        </p>
        <p>
          Le traitement est soumis à la loi organique n°&nbsp;2004-63 du 27
          juillet 2004 portant sur la protection des données à caractère
          personnel.
        </p>
      </Section>

      <Section
        id="collecte"
        numero={2}
        titre="Ce que nous collectons, et pourquoi"
      >
        <p>
          Nous ne collectons rien «&nbsp;au cas où&nbsp;». Chaque donnée
          ci-dessous sert à une fonction précise du service.
        </p>

        <p className="font-semibold text-neutral-900">Votre compte</p>
        <Liste>
          <li>
            <strong>Nom, prénom, adresse e-mail, numéro de téléphone.</strong>{" "}
            Pour créer votre compte, vous authentifier, et permettre à
            l&apos;autre partie d&apos;identifier son interlocuteur.
          </li>
          <li>
            <strong>Photo de profil</strong>, si vous en ajoutez une.
            Facultative.
          </li>
          <li>
            <strong>Préférences de notification et langue.</strong>
          </li>
        </Liste>

        <p className="font-semibold text-neutral-900">
          Vérification — transporteurs uniquement
        </p>
        <Liste>
          <li>
            <strong>Pièces d&apos;identité et documents du véhicule</strong> :
            carte d&apos;identité nationale (recto et verso), permis de
            conduire, carte grise, attestation d&apos;assurance, et un selfie
            tenant votre pièce. Ces documents servent exclusivement à vérifier
            que vous êtes bien qui vous dites être et que votre véhicule est en
            règle. Une pièce doit être en cours de validité au moment de
            l&apos;envoi&nbsp;: un document périmé est refusé.
          </li>
          <li>
            <strong>Informations sur le véhicule</strong> : type,
            immatriculation, capacité en kilogrammes et en mètres cubes, photos
            du véhicule.
          </li>
        </Liste>

        <p className="font-semibold text-neutral-900">Vos missions</p>
        <Liste>
          <li>
            <strong>Trajets et demandes</strong> : gouvernorats de départ et
            d&apos;arrivée, adresses, dates et créneaux, description de la
            marchandise, poids, volume, photos de la marchandise, prix proposés.
          </li>
          <li>
            <strong>Déroulé</strong> : confirmations de départ et de livraison,
            photo de preuve de livraison lorsque le transporteur en joint une,
            code de livraison.
          </li>
          <li>
            <strong>Messages</strong> échangés avec l&apos;autre partie au sujet
            d&apos;une mission.
          </li>
          <li>
            <strong>Avis</strong> que vous déposez ou recevez.
          </li>
          <li>
            <strong>Éléments d&apos;un litige</strong> que vous ouvrez ou qui
            vous concerne.
          </li>
        </Liste>

        <p className="font-semibold text-neutral-900">Paiements</p>
        <Liste>
          <li>
            <strong>Montants, commissions, dates, mode de paiement</strong> —
            nécessaires à la facturation et à nos obligations comptables.
          </li>
          <li>
            <strong>Aucune donnée de carte bancaire.</strong> Les paiements en
            ligne sont traités par notre prestataire de paiement&nbsp;: vos
            coordonnées bancaires ne transitent jamais par Transporti et ne sont
            jamais stockées par nous.
          </li>
        </Liste>

        <p className="font-semibold text-neutral-900">Techniques</p>
        <Liste>
          <li>
            <strong>Identifiant de notification de votre appareil</strong>, pour
            vous alerter d&apos;une demande reçue ou d&apos;une réponse.
          </li>
          <li>
            <strong>Journaux techniques</strong> — dates de connexion, erreurs —
            pour faire fonctionner et sécuriser le service.
          </li>
        </Liste>
      </Section>

      <Section id="localisation" numero={3} titre="Votre position">
        <p>
          L&apos;application peut vous demander l&apos;accès à votre position
          pour vous situer sur la carte des trajets.{" "}
          <strong>Vous pouvez refuser</strong>&nbsp;: la recherche, l&apos;envoi
          d&apos;une demande et le suivi d&apos;une mission fonctionnent sans.
        </p>
        <p>
          Nous ne suivons pas votre position en arrière-plan et ne conservons
          pas d&apos;historique de vos déplacements.
        </p>
      </Section>

      <Section id="destinataires" numero={4} titre="Qui voit vos données">
        <p className="font-semibold text-neutral-900">
          L&apos;autre partie à une mission
        </p>
        <p>
          Le service consiste à vous mettre en relation&nbsp;: certaines
          informations sont donc nécessairement partagées avec la personne
          d&apos;en face.
        </p>
        <Liste>
          <li>
            <strong>Le transporteur voit</strong>, sur une demande qui lui est
            adressée&nbsp;: votre prénom et l&apos;initiale de votre nom, la
            marchandise, son poids, son volume, vos photos, l&apos;adresse de
            retrait et le créneau, le prix proposé.
          </li>
          <li>
            <strong>Le client voit</strong>&nbsp;: le prénom et l&apos;initiale
            du nom du transporteur, sa note et son statut de vérification, son
            véhicule et sa capacité, le déroulé de la mission et la preuve de
            livraison.
          </li>
          <li>
            <strong>Le numéro de téléphone</strong> n&apos;est communiqué à
            l&apos;autre partie qu&apos;à partir du démarrage effectif de la
            mission, lorsqu&apos;il devient nécessaire de se joindre.
          </li>
        </Liste>

        <p className="font-semibold text-neutral-900">Nos sous-traitants</p>
        <Liste>
          <li>
            <strong>Prestataire de paiement</strong> (Konnect, Tunisie) —
            traitement des paiements en ligne et des remboursements.
          </li>
          <li>
            <strong>Google Maps</strong> — affichage des cartes et des
            corridors.
          </li>
          <li>
            <strong>Expo</strong> — acheminement des notifications vers votre
            appareil.
          </li>
          <li>
            <strong>Hébergeur</strong> —{" "}
            <ARemplir>nom et pays d&apos;hébergement</ARemplir>.
          </li>
        </Liste>

        <p className="font-semibold text-neutral-900">Les autorités</p>
        <p>
          Sur réquisition judiciaire ou administrative régulière, et dans les
          seules limites de cette réquisition.
        </p>
        <p>
          <strong>
            Nous ne vendons pas vos données et ne les cédons à aucun annonceur.
          </strong>
        </p>
      </Section>

      <Section id="duree" numero={5} titre="Combien de temps nous les gardons">
        <Liste>
          <li>
            <strong>Compte actif</strong> — vos données sont conservées tant que
            votre compte existe.
          </li>
          <li>
            <strong>Après clôture</strong> — votre compte est anonymisé (voir la
            section suivante).
          </li>
          <li>
            <strong>Pièces comptables</strong> — factures, commissions,
            écritures liées aux paiements&nbsp;: conservées{" "}
            <ARemplir>durée légale retenue</ARemplir> conformément à nos
            obligations comptables et fiscales.
          </li>
          <li>
            <strong>Documents de vérification</strong> — conservés cinq ans
            après la fin de leur validité (permis de conduire, carte grise,
            attestation d&apos;assurance). La carte d&apos;identité et le
            selfie, qui ne portent pas de date de validité, sont conservés cinq
            ans après la fermeture de votre compte. Passé ce délai, le fichier
            est supprimé définitivement.
          </li>
          <li>
            <strong>Journaux techniques</strong> —{" "}
            <ARemplir>durée retenue</ARemplir>.
          </li>
        </Liste>
      </Section>

      <Section
        id="cloture"
        numero={6}
        titre="Fermer votre compte : ce qui disparaît, ce qui reste"
      >
        <p>
          Vous pouvez fermer votre compte à tout moment depuis
          l&apos;application, dans votre profil. La clôture est refusée tant
          qu&apos;une mission est en cours ou qu&apos;un litige est ouvert.
        </p>
        <Encadre titre="Ce qui est effacé immédiatement">
          <Liste>
            <li>Vos nom, prénom, adresse e-mail et numéro de téléphone.</li>
            <li>Votre photo de profil.</li>
            <li>Votre carnet d&apos;adresses enregistrées.</li>
            <li>
              Les identifiants de notification de vos appareils — plus aucune
              notification ne vous est envoyée.
            </li>
          </Liste>
        </Encadre>
        <Encadre titre="Ce qui est conservé, et pourquoi">
          <p>
            Vos missions passées et les écritures comptables qui s&apos;y
            rattachent sont conservées, mais{" "}
            <strong>détachées de votre identité</strong>&nbsp;: elles
            n&apos;apparaissent plus que sous la mention «&nbsp;compte
            supprimé&nbsp;».
          </p>
          <p>
            La raison est double. L&apos;autre partie à une mission a le droit
            de conserver l&apos;historique de sa propre activité, et nous avons
            des obligations comptables et fiscales sur les sommes qui ont
            transité.
          </p>
          <p>
            Si vous êtes transporteur, vos documents de vérification ne sont pas
            effacés à la clôture&nbsp;: ils restent nécessaires en cas de litige
            ou de contrôle portant sur une mission passée. Ils sont supprimés à
            l&apos;échéance indiquée plus haut&nbsp;: cinq ans après la fin de
            leur validité, ou cinq ans après la fermeture du compte pour la
            carte d&apos;identité et le selfie.
          </p>
        </Encadre>
      </Section>

      <Section id="droits" numero={7} titre="Vos droits">
        <p>
          Conformément à la loi n°&nbsp;2004-63, vous disposez d&apos;un droit
          d&apos;accès, de rectification et d&apos;opposition sur vos données.
        </p>
        <Liste>
          <li>
            <strong>Accéder et corriger</strong> — l&apos;essentiel se fait
            directement dans l&apos;application, depuis votre profil.
          </li>
          <li>
            <strong>Obtenir une copie</strong> de vos données&nbsp;:
            écrivez-nous.
          </li>
          <li>
            <strong>Supprimer</strong> — la clôture de compte, décrite
            ci-dessus.
          </li>
          <li>
            <strong>Vous opposer</strong> à un traitement, dans les limites
            prévues par la loi.
          </li>
        </Liste>
        <p>
          Nous répondons sous <ARemplir>délai de réponse retenu</ARemplir>. Si
          notre réponse ne vous satisfait pas, vous pouvez saisir
          l&apos;Instance nationale de protection des données personnelles
          (INPDP).
        </p>
      </Section>

      <Section id="securite" numero={8} titre="Comment nous les protégeons">
        <Liste>
          <li>
            Les échanges avec l&apos;application sont chiffrés en transit.
          </li>
          <li>
            Les mots de passe ne sont jamais stockés en clair&nbsp;: ils sont
            hachés.
          </li>
          <li>
            L&apos;accès aux données est cloisonné par compte&nbsp;: un
            utilisateur ne peut voir que ses propres missions et celles
            auxquelles il est partie.
          </li>
          <li>
            L&apos;accès de nos équipes aux documents de vérification est limité
            aux personnes qui les examinent, et tracé.
          </li>
        </Liste>
        <p>
          Aucun système n&apos;est invulnérable. En cas d&apos;incident touchant
          vos données, nous vous en informerons ainsi que l&apos;autorité
          compétente.
        </p>
      </Section>

      <Section id="mineurs" numero={9} titre="Mineurs">
        <p>
          Le service n&apos;est pas destiné aux personnes de moins de 18 ans et
          nous ne collectons pas sciemment leurs données. Si vous constatez
          qu&apos;un mineur a créé un compte, signalez-le-nous&nbsp;: nous le
          fermerons.
        </p>
      </Section>

      <Section
        id="modifications"
        numero={10}
        titre="Modifications de cette politique"
      >
        <p>
          Si nous changeons ce que nous faisons de vos données, nous mettrons
          cette page à jour et vous en informerons dans l&apos;application avant
          que le changement ne prenne effet.
        </p>
      </Section>

      <Section id="contact" numero={11} titre="Nous écrire">
        <p>
          <ARemplir>adresse e-mail dédiée aux données personnelles</ARemplir>
        </p>
        <p className="text-sm text-neutral-500">
          Voir aussi les{" "}
          <Link href="/conditions" className="text-primary-600 underline">
            conditions générales d&apos;utilisation
          </Link>{" "}
          et l&apos;
          <Link href="/aide" className="text-primary-600 underline">
            aide
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
