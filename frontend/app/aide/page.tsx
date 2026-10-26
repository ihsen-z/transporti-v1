import type { Metadata } from "next";
import Link from "next/link";
import { lirePaymentConfigServeur } from "@/lib/services/paymentConfigServeur";
import {
  LegalPage,
  Section,
  Liste,
  Encadre,
  ARemplir,
} from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Aide",
  description:
    "Comment fonctionne Transporti : envoyer une demande, publier un retour, être payé, le code de livraison, les litiges et la fermeture de compte.",
};

/** Question / réponse. Le titre porte la question telle qu'on se la pose. */
function QR({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-neutral-200 pt-5">
      <h3 className="font-semibold text-neutral-900">{q}</h3>
      <div className="mt-2 flex flex-col gap-3 text-neutral-700 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export default async function AidePage() {
  // Le plafond espèces vient du serveur : relever COD_MAX_AMOUNT ne doit pas
  // laisser l'aide annoncer l'ancienne valeur.
  const { cod_max_amount } = await lirePaymentConfigServeur();

  return (
    <LegalPage
      titre="Aide"
      chapeau="Comment fonctionne Transporti, question par question. Si vous ne trouvez pas votre réponse, écrivez-nous : nous répondons à tout le monde."
      maj={<ARemplir>date de dernière révision</ARemplir>}
    >
      <Section id="principe" numero={1} titre="Le principe, en trois phrases">
        <p>
          Chaque jour, des camions rentrent à vide après une livraison. Ces
          kilomètres sont payés par le transporteur et ne rapportent rien.
        </p>
        <p>
          Transporti permet au transporteur de publier ce retour, et à
          quelqu&apos;un qui doit expédier sur le même corridor de le trouver.
        </p>
        <p>
          Le transporteur rentabilise un trajet qu&apos;il faisait de toute
          façon&nbsp;; le client paie moins cher qu&apos;un transport dédié.
        </p>
      </Section>

      <Section
        id="client"
        numero={2}
        titre="Vous avez quelque chose à expédier"
      >
        <div className="flex flex-col gap-5">
          <QR q="Comment trouver un transporteur ?">
            <p>
              Depuis l&apos;accueil, indiquez d&apos;où part votre marchandise
              et où elle va. La date est facultative&nbsp;: sans elle, vous
              voyez tout le corridor.
            </p>
            <p>
              Vous pouvez affiner par type de marchandise, poids et volume. Les
              trajets dont le transporteur n&apos;a pas déclaré sa capacité
              restent affichés&nbsp;: une absence d&apos;information n&apos;est
              pas un refus.
            </p>
          </QR>

          <QR q="Et si aucun trajet ne correspond ?">
            <p>
              L&apos;écran vous propose toujours une suite, jamais une
              impasse&nbsp;:
            </p>
            <Liste>
              <li>
                Si vous aviez posé une date, voir{" "}
                <strong>tout le corridor</strong>, toutes dates confondues.
              </li>
              <li>
                Si vous aviez posé des filtres, voir{" "}
                <strong>sans les filtres</strong> — le corridor n&apos;est
                peut-être pas vide, ce sont vos critères qui ne trouvent rien.
              </li>
              <li>
                Sinon, <strong>élargir aux gouvernorats voisins</strong>, ou
                créer une <strong>alerte corridor</strong>&nbsp;: vous êtes
                prévenu dès qu&apos;un trajet compatible est publié.
              </li>
            </Liste>
          </QR>

          <QR q="Que dois-je mettre dans ma demande ?">
            <p>
              Décrivez ce que vous expédiez, et ajoutez le poids, le volume et
              une à trois photos. Ce n&apos;est pas de la paperasse&nbsp;: un
              transporteur qui voit la marchandise accepte ou refuse tout de
              suite, au lieu de vous rappeler pour poser des questions — ou
              d&apos;annuler sur place en découvrant le chargement.
            </p>
            <p>
              L&apos;adresse de retrait et le créneau sont facultatifs mais
              évitent un aller-retour.
            </p>
          </QR>

          <QR q="Pourquoi ma demande est-elle refusée à l'envoi ?">
            <p>
              Si le poids que vous indiquez dépasse la capacité annoncée par ce
              transporteur, la demande est refusée immédiatement, avec le
              chiffre exact. Mieux vaut le savoir maintenant qu&apos;au
              chargement.
            </p>
            <p>
              Vous ne pouvez également avoir qu&apos;une seule demande en cours
              sur un même trajet.
            </p>
          </QR>

          <QR q="Comment je paie ?">
            <p>
              <strong>En ligne</strong>&nbsp;: vous réglez à l&apos;acceptation,
              et la somme est <strong>retenue par Transporti</strong>. Le
              transporteur n&apos;est payé qu&apos;après que vous ayez confirmé
              la livraison. C&apos;est le mode le plus sûr.
            </p>
            <p>
              <strong>En espèces à la livraison</strong>&nbsp;: vous réglez
              directement le transporteur. Ce mode est limité à{" "}
              <strong>{cod_max_amount.toLocaleString("fr-FR")}&nbsp;TND</strong>{" "}
              par mission.
            </p>
          </QR>

          <QR q="C'est quoi le code de livraison ?">
            <p>
              Un code à quatre chiffres que vous seul détenez. Le transporteur
              doit le saisir pour clore la mission&nbsp;: sans lui, elle ne peut
              pas être déclarée livrée.
            </p>
            <p>
              <strong>
                Ne le communiquez qu&apos;au moment où vous recevez réellement
                votre marchandise.
              </strong>{" "}
              Le donner à l&apos;avance, c&apos;est renoncer à la protection
              qu&apos;il vous apporte.
            </p>
          </QR>

          <QR q="Comment je récupère mon argent si ça se passe mal ?">
            <p>
              Tant que vous n&apos;avez pas confirmé la réception, la somme
              reste chez Transporti. Ouvrez un litige depuis la mission&nbsp;:
              cela <strong>gèle le versement</strong>. Nos équipes examinent les
              éléments des deux parties — messages, photos, jalons — et décident
              de la répartition.
            </p>
          </QR>
        </div>
      </Section>

      <Section id="transporteur" numero={3} titre="Vous transportez">
        <div className="flex flex-col gap-5">
          <QR q="Comment publier un retour ?">
            <p>
              Bouton central, «&nbsp;Publier&nbsp;». Indiquez le corridor et la
              date&nbsp;; l&apos;adresse précise est facultative, un retour se
              cherche par corridor et non par rue.
            </p>
            <p>
              «&nbsp;Estimer le prix&nbsp;» remplit la fourchette à partir de la
              grille serveur et de la distance. Les montants restent
              modifiables&nbsp;: vous connaissez votre trajet mieux que la
              grille.
            </p>
            <p>
              Après une livraison, l&apos;application vous propose le corridor
              inverse pré-rempli — c&apos;est le moment où publier coûte le
              moins.
            </p>
          </QR>

          <QR q="Pourquoi déclarer ma capacité en kilos ?">
            <p>
              Parce que c&apos;est ce qui filtre les demandes. Un client qui
              cherche pour 2&nbsp;tonnes ne verra pas votre fourgon de
              500&nbsp;kg, et vous ne recevrez pas de demande que vous ne pouvez
              pas prendre.
            </p>
            <p>
              Si vous ne la déclarez pas, votre trajet reste visible de tous —
              mais vous recevrez des demandes hors de votre portée.
            </p>
          </QR>

          <QR q="Combien je touche vraiment ?">
            <p>
              Le montant net, commission déduite, vous est affiché{" "}
              <strong>avant</strong> que vous n&apos;acceptiez. La commission
              dépend du type de mission&nbsp;:
            </p>
            <Liste>
              <li>
                <strong>8&nbsp;%</strong> sur un trajet retour — le taux le plus
                bas, parce que c&apos;est ce que la plateforme veut encourager.
              </li>
              <li>
                <strong>12&nbsp;%</strong> sur un transport de marchandise.
              </li>
              <li>
                <strong>15&nbsp;%</strong> sur un déménagement.
              </li>
            </Liste>
            <p>
              Aucune commission n&apos;est prélevée sur une mission qui
              n&apos;aboutit pas.
            </p>
          </QR>

          <QR q="Comment se faire vérifier ?">
            <p>
              Profil, puis «&nbsp;Vérification&nbsp;». Déposez votre carte
              d&apos;identité, votre permis, la carte grise et
              l&apos;attestation d&apos;assurance.
            </p>
            <p>
              Le badge «&nbsp;vérifié&nbsp;» change beaucoup&nbsp;: c&apos;est
              le premier élément qu&apos;un client regarde avant de confier sa
              marchandise à un inconnu.
            </p>
          </QR>

          <QR q="Pourquoi joindre une photo à la livraison ?">
            <p>
              Parce qu&apos;en cas de contestation, c&apos;est ce qui vous
              défend. La photo est horodatée dans le déroulé de la mission et
              visible par le client. Elle est facultative&nbsp;: le code du
              client reste la seule condition de clôture.
            </p>
          </QR>

          <QR q="Quand suis-je payé ?">
            <p>
              Pour une mission réglée en ligne, dès que le client confirme la
              réception — la somme rejoint alors votre solde disponible, et vous
              pouvez demander un retrait depuis «&nbsp;Gains&nbsp;».
            </p>
            <p>
              Pour une mission réglée en espèces, vous encaissez directement, et
              la commission devient une dette réglée sur vos gains suivants.
              Elle est affichée séparément de votre solde, pour que vous ne
              confondiez pas les deux.
            </p>
          </QR>
        </div>
      </Section>

      <Section id="compte" numero={4} titre="Votre compte">
        <div className="flex flex-col gap-5">
          <QR q="Comment supprimer mon compte ?">
            <p>
              Profil, tout en bas. Vos nom, e-mail, téléphone, photo et carnet
              d&apos;adresses sont effacés&nbsp;; vos missions passées sont
              conservées mais détachées de votre identité, parce que
              l&apos;autre partie a le droit de garder son propre historique et
              que nous avons des obligations comptables.
            </p>
            <p>
              La suppression est refusée tant qu&apos;une mission est en cours
              ou qu&apos;un litige est ouvert. Terminez-la d&apos;abord.
            </p>
          </QR>

          <QR q="Pourquoi l'application demande ma position ?">
            <p>
              Uniquement pour vous situer sur la carte des trajets. Vous pouvez
              refuser sans rien perdre&nbsp;: la recherche, les demandes et le
              suivi fonctionnent sans. Nous ne suivons pas vos déplacements.
            </p>
          </QR>

          <QR q="L'application est-elle disponible en arabe ?">
            <p>
              Oui, entièrement, y compris le sens de lecture. Le choix se fait
              depuis le profil.
            </p>
          </QR>
        </div>
      </Section>

      <Section id="contact" numero={5} titre="Nous joindre">
        <Encadre titre="Une question sans réponse ici ?">
          <p>
            Écrivez-nous à <ARemplir>adresse e-mail de contact</ARemplir> ou
            appelez le <ARemplir>téléphone</ARemplir>,{" "}
            <ARemplir>horaires</ARemplir>.
          </p>
          <p>
            Pour un problème sur une mission précise, ouvrez un litige depuis la
            mission elle-même&nbsp;: nous aurons le contexte sous les yeux, et
            le versement est gelé le temps de l&apos;examen.
          </p>
        </Encadre>
        <p className="text-sm text-neutral-500">
          Voir aussi les{" "}
          <Link href="/conditions" className="text-primary-600 underline">
            conditions générales
          </Link>{" "}
          et la{" "}
          <Link href="/confidentialite" className="text-primary-600 underline">
            politique de confidentialité
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
