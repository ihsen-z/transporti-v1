"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useJobDetail } from "@/hooks/useJobDetail";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { urlJob } from "@/lib/routes/jobs";

/**
 * Route de RESOLUTION. Ne montre pas de job : elle en determine la nature,
 * puis remplace l'URL par la route canonique (/demandes/<id> ou
 * /trajets/<id>).
 *
 * Pourquoi elle existe encore. Elle couvre deux cas, et seulement ces deux :
 *
 * 1. les liens ANCIENS ou partages, /jobs/<id> ayant ete l'URL unique du
 *    detail d'un job jusqu'a la separation par nature ;
 * 2. le rare appelant qui ne connait pas la nature — une notification dont le
 *    job a ete supprime depuis, ou tout futur appelant qui n'aurait que l'id.
 *
 * Elle n'est PAS sur le chemin de la navigation normale : les cinq charges
 * utiles qui ne portaient que l'id du job portent desormais aussi sa nature
 * (`is_return_trip`), et construisent l'URL canonique directement. C'est
 * pourquoi l'ecran d'attente ci-dessous ne se voit quasiment jamais.
 *
 * Pourquoi la resolution n'est pas faite cote serveur : le jeton JWT vit dans
 * `localStorage` et `GET /api/jobs/<id>/` repond 401 sans lui. Voir
 * lib/routes/jobs.ts.
 */
export default function JobResolverPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useAppI18n();

  const jobId = params?.id
    ? parseInt(Array.isArray(params.id) ? params.id[0] : params.id)
    : null;

  const { transport: job, chargement, erreur, relire } = useJobDetail(jobId);

  useEffect(() => {
    if (!job) return;
    // `replace` et non `push` : cette route est un intermediaire technique.
    // L'empiler mettrait le retour arriere du navigateur dans une boucle.
    router.replace(urlJob(job.id, job.is_return_trip === true));
  }, [job, router]);

  if (erreur === "network")
    return (
      <div role="alert" className="p-8 text-center">
        <p className="text-neutral-900 font-medium">
          {t.jobDetail.loadFailTitle}
        </p>
        <p className="text-neutral-500 text-sm mt-1">
          {t.jobDetail.loadFailDesc}
        </p>
        <button
          onClick={relire}
          className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {t.jobDetail.retry}
        </button>
      </div>
    );

  if (erreur === "not_found")
    return (
      <div className="p-8 text-center text-red-500">{t.jobDetail.notFound}</div>
    );

  // Chargement, et le bref instant entre la reponse et la redirection.
  return (
    <div className="p-8 text-center text-neutral-500">
      {t.jobDetail.loading}
    </div>
  );
}
