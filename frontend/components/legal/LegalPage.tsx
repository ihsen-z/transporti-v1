import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

/**
 * Coque des pages légales publiques — conditions, confidentialité, aide.
 *
 * PUBLIQUE et non protégée, délibérément : les stubs précédents vivaient sous
 * `app/(app)/`, donc derrière `AuthGuard`. Un examinateur de store ne peut pas
 * créer de compte pour lire une politique de confidentialité, et un lien de
 * politique inaccessible est un motif de refus chez Google comme chez Apple.
 *
 * Composant SERVEUR : aucun hook, donc le contenu est dans le HTML rendu. Une
 * page légale doit être lisible par un robot d'indexation et par un
 * examinateur, pas seulement par un navigateur qui exécute du JavaScript.
 */

export function LegalPage({
  titre,
  chapeau,
  maj,
  children,
}: {
  titre: string;
  chapeau: string;
  /** Date de dernière mise à jour. Accepte un nœud, pour porter un blanc à
   *  remplir tant que la date d'entrée en vigueur n'est pas arrêtée. */
  maj: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 tracking-tight">
            {titre}
          </h1>
          <p className="mt-4 text-lg text-neutral-600 leading-relaxed">
            {chapeau}
          </p>
          <p className="mt-6 text-sm text-neutral-500">
            Dernière mise à jour&nbsp;: {maj}
          </p>
          <div className="mt-10 border-t border-neutral-200 pt-10">
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

/** Titre de section, numéroté par l'ordre de lecture. */
export function Section({
  id,
  numero,
  titre,
  children,
}: {
  id: string;
  numero: number;
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-12 scroll-mt-24">
      <h2 className="text-xl font-bold text-neutral-900 flex items-baseline gap-3">
        <span className="text-sm font-semibold text-primary-600 tabular-nums">
          {String(numero).padStart(2, "0")}
        </span>
        {titre}
      </h2>
      <div className="mt-4 space-y-4 text-neutral-700 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

/** Liste à puces, même rythme vertical que les paragraphes. */
export function Liste({ children }: { children: React.ReactNode }) {
  return (
    <ul className="space-y-2 pl-5 list-disc marker:text-primary-500">
      {children}
    </ul>
  );
}

/** Encadré pour ce qui engage : un plafond, un délai, une exclusion. */
export function Encadre({
  titre,
  children,
}: {
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-neutral-200 border-l-4 border-l-primary-500 bg-neutral-50 px-5 py-4 rounded-r">
      <p className="font-semibold text-neutral-900">{titre}</p>
      <div className="mt-2 space-y-2 text-sm text-neutral-700 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

/**
 * Blanc juridique — une information que seul l'exploitant peut fournir
 * (raison sociale, matricule fiscal, adresse du siège, contact du responsable
 * de traitement).
 *
 * Volontairement TRÈS visible, en ambre : un blanc discret finit par être
 * publié tel quel. Il doit sauter aux yeux tant qu'il n'est pas rempli.
 */
export function ARemplir({ children }: { children: React.ReactNode }) {
  return (
    <mark className="bg-amber-100 text-amber-900 border border-amber-300 rounded px-1.5 py-0.5 font-medium">
      [à compléter&nbsp;: {children}]
    </mark>
  );
}
