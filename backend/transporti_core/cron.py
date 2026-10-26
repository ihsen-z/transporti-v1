"""
Deux routes pour l'hébergement gratuit (décision du 26/10/2026) :

- GET /ping/ : « le serveur répond », SANS toucher à la base. C'est elle que
  vise le contrôle de santé de Render et l'éventuel cron qui garde le serveur
  éveillé : /health/ interroge la base, et l'appeler toutes les quelques
  secondes empêcherait Neon de se mettre en pause, au point d'épuiser ses
  heures de calcul gratuites.

- POST /api/v1/taches-planifiees/?groupe=frequentes|quotidiennes : lance un
  groupe de tâches de maintenance (logistics/taches_planifiees.py). Elle
  remplace le service « worker », absent de l'offre gratuite. Elle exige
  l'en-tête `Authorization: Bearer <CRON_SECRET>` ; sans secret configuré,
  elle n'existe pas (404).
"""
import hmac

from django.conf import settings
from django.http import Http404, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from logistics.taches_planifiees import GROUPES, executer_groupe


@require_GET
def ping(request):
    return JsonResponse({'status': 'ok'})


def _secret_valide(request) -> bool:
    attendu = settings.CRON_SECRET
    entete = request.headers.get('Authorization', '')
    if not attendu or not entete.startswith('Bearer '):
        return False
    # Comparaison à temps constant : la durée ne révèle rien du secret.
    return hmac.compare_digest(entete.removeprefix('Bearer '), attendu)


@csrf_exempt  # appel machine à machine, sans session ni cookie
@require_POST
def taches_planifiees(request):
    if not settings.CRON_SECRET:
        raise Http404
    if not _secret_valide(request):
        return JsonResponse({'error': 'Non autorisé.'}, status=401)

    groupe = request.GET.get('groupe', '')
    if groupe not in GROUPES:
        return JsonResponse(
            {'error': f"Paramètre groupe attendu : {' ou '.join(GROUPES)}."}, status=400,
        )

    resultats = executer_groupe(groupe)
    # 500 si une tâche a échoué : le cron externe signale alors l'échec
    # (cron-job.org envoie un e-mail, GitHub Actions marque le job en rouge).
    statut = 200 if all(resultats.values()) else 500
    return JsonResponse({'groupe': groupe, 'taches': resultats}, status=statut)
