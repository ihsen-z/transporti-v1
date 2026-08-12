# RAPPORT D'EXÉCUTION — LOTS 3 & 4 + correctif bug 5.1

**Date :** 12 août 2026 · **Référence :** `PLAN_ACHEVEMENT_MOBILE_2026-08-07.md`
**Périmètre de la session :** achever le Lot 3 (confiance et réversibilité), puis le Lot 4
(réactivité — push et routes adressables), plus le correctif du bug actif 5.1. Les Lots 0, 1 et 2
étaient déjà livrés (commit `187e3aa`, 10/08/2026) au démarrage de cette session.

**Méthode.** Chaque tâche a été vérifiée contre le code réel avant d'être considérée comme
manquante : pour le Lot 4 notamment, les six endpoints backend nécessaires (`transporter-cancel`,
`trip-requests/.../cancel`, `corridor-alerts`, `password-reset/confirm`, `transporter/profile`,
`reviews/user`) existaient déjà et n'ont demandé aucune modification serveur — seul le mobile ne les
appelait pas. Le détail de cette vérification vit dans le corps du rapport, pas seulement dans son
résumé.

---

## 1. Résumé exécutif

| Chantier | Statut | Reste |
|---|:--:|---|
| **Lot 3** — confiance et réversibilité | ✅ Livré | Vérification device (build EAS) |
| **Lot 4** — push et routes adressables | ✅ Livré (7/9 tâches) | 4.9 (arbitrage BO), vérification device |
| **Bug 5.1** — missions invisibles au-delà de 20 | ✅ Corrigé | — |
| Mise à jour de `PLAN_ACHEVEMENT_MOBILE_2026-08-07.md` | ✅ Faite | — |

**Aucun commit n'a été créé.** Tous les fichiers listés en §6 sont dans l'arbre de travail, prêts à
être relus avant tout commit.

---

## 2. Lot 3 — Confiance et réversibilité

Sur les 8 tâches du lot, **2 étaient déjà résolues** comme effet de bord du Lot 2 :

| # | Tâche | Constat |
|---|---|---|
| 3.2 | Annulation client | Déjà câblée : `useClientCancel.ts`, exposée depuis `mission/[id].tsx` |
| 3.5 | Gating avis/litige à mission terminée | Déjà le comportement de `mission/[id].tsx:197` (`d.status === 'COMPLETED'`) |

Les 6 tâches restantes ont été construites cette session :

| # | Tâche | Fichiers créés/modifiés |
|---|---|---|
| 3.1 | Profil transporteur public + avis, avant l'envoi d'une demande | `src/features/profiles/api/{dto,useTransporterProfile,useTransporterReviews}.ts`, `app/(app)/transporteur/[id].tsx`, `TripResultCard.tsx` (+ `owner_id`/`owner_rating`/`owner_review_count`/`owner_verification_status` sur `TripResultDto`) |
| 3.3 | Annulation transporteur (motif obligatoire) | `src/features/missions/api/useTransporterCancel.ts`, `TransporterCancelSheet.tsx`, `MissionCard.tsx` |
| 3.4 | Retrait d'une demande en attente | `src/features/my-requests/api/useCancelRequest.ts`, `MyRequestCard.tsx` |
| 3.6 | Liste + suppression des alertes corridor | `src/features/search/api/{useCorridorAlerts,useDeleteCorridorAlert}.ts`, `CorridorAlertRow.tsx`, `CorridorAlertsPanel.tsx`, `search.tsx` |
| 3.7 | Écran de confirmation « mot de passe oublié » | `src/features/auth/api/usePasswordResetConfirm.ts`, `ResetPasswordForm.tsx`, `app/(auth)/reset-password.tsx`, `useDeepLinkRouting.ts` |
| 3.8 | Onglet CLIENT « Mes demandes » | `app/(app)/mes-demandes.tsx`, `FloatingTabBar.tsx`, `home.tsx` (retrait de la section noyée), `MyRequestsList.tsx` |

**Découverte notable :** pour les 4 tâches marquées « endpoint opérationnel, jamais appelé » dans le
plan (3.1, 3.3, 3.4, 3.6), c'était vérifié exact — `TransporterCancelView`, `TripRequestCancelView`,
`CorridorAlertListCreateView`/`CorridorAlertDeleteView` et `TransporterProfileView`/`ReviewListView`
existaient déjà tels quels côté backend. Zéro ligne de backend modifiée pour ce lot.

**i18n.** Toutes les clés nouvelles ont été ajoutées en FR **et** AR. Parité vérifiée par un diff
structurel des deux fichiers de locale ; seul écart : le schéma de pluriel arabe à 6 catégories
(`_0`…`_5`) contre singulier/pluriel français — la convention déjà en usage dans le fichier pour
`trips.success` et `search.results_count`.

---

## 3. Lot 4 — Réactivité : push et routes adressables

7 des 9 tâches sont faites. **4.9 n'a délibérément pas été touchée** — le plan la qualifie
explicitement d'arbitrage à porter au BO (accepter la latence de `notify_corridor_alerts` dans le
cycle HTTP, ou provisionner un worker asynchrone), pas d'un bug à corriger en silence.

| # | Tâche | Ce qui a été fait |
|---|---|---|
| 4.1 | Décision provider push | Confirmée : **Expo Push**, comme recommandé le 07/08 |
| 4.2 | Transport push réel + déclaration infra | `_send_expo()` (HTTP vers `exp.host`) dans `push_service.py` ; `PUSH_NOTIFICATION_MODE`/`MOBILE_APP_SCHEME`/`MOBILE_DEEP_LINK_ENABLED` déclarés dans `render.yaml` |
| 4.3 | Contrat `devices/register/` pour tokens Expo | **Non-problème confirmé** : le champ `token` n'a jamais eu de contrainte de format — seul le `help_text` a été corrigé (+ migration) |
| 4.4 | Métrique `sent` faussée en sandbox | `send_push_notification()` distingue désormais `sent` (réel) de `logged` (sandbox) |
| 4.5 | Migration de routes messages/requests | `messages.tsx`/`requests.tsx` → `{_layout,index,[jobId]}.tsx` dans chaque dossier |
| 4.6 | Retour matériel Android | `FloatingTabBar.go()` émet `tabPress` dans tous les cas (reset de pile au retap) |
| 4.7 | Table `type + metadata → route` | `src/features/notifications/data/notificationRoute.ts` + 16 tests, branché dans `NotificationBell.tsx` |
| 4.8 | `expo-notifications` (permission, token, réception, tap) | `src/core/push/usePushNotifications.ts`, monté dans `app/(app)/_layout.tsx` |
| 4.9 | Émission asynchrone de `notify()` | **Non traité** — arbitrage BO, cf. §5 |

### 3.1 Décision technique prise : `_send_expo`

Implémentation réelle (pas un stub) : `POST https://exp.host/--/api/v2/push/send`, sans clé ni
compte — c'est précisément l'argument qui avait fait retenir Expo Push plutôt que Firebase en 4.1.
Un ticket d'erreur `DeviceNotRegistered` (réponse HTTP 200 avec un statut d'erreur par ticket, pas
une exception HTTP) est traduit en exception Python contenant la phrase `"not registered"`, pour
que la détection de token invalide déjà en place (`_is_token_invalid_error`) continue de
fonctionner sans modification.

`_send_firebase()` (placeholder `NotImplementedError` depuis l'origine) a été supprimé : mort dès
que la décision Expo est actée, pas seulement en théorie.

### 3.2 Décision de prudence : `PUSH_NOTIFICATION_MODE` reste `SANDBOX`

La variable est désormais déclarée dans `render.yaml` (elle en était absente), mais sa valeur reste
`SANDBOX`. Aucun appareil réel n'a pu confirmer une réception dans cet environnement (pas de compte
Expo/EAS), et personne ne surveille encore les tickets d'erreur Expo en production. Même logique de
prudence que la passerelle de paiement du Lot 2 : le code est prêt, le flip est un changement de
variable d'environnement, pas un redéploiement.

### 3.3 Rôle et routage (4.7)

`resolveNotificationRoute(type, metadata, role)` prend le rôle en paramètre explicite : un même
`type` (ex. `JOB_COMPLETED`) est émis vers le client et le transporteur, mais seul le client a un
écran de suivi adressable (`mission/[id]`, livré au Lot 2) — le transporteur n'en a pas. La fonction
rend `null` plutôt que de router vers un écran qui n'a pas de sens pour ce rôle. Testé pour les deux
rôles, y compris les cas `null` volontaires (canal classique non construit sur mobile, événements
sans écran de détail).

### 3.4 Repli gracieux sur l'absence de compte Expo/EAS (4.8)

`usePushNotifications()` vérifie `env.easProjectId` avant d'appeler `getExpoPushTokenAsync` (qui
lèverait sans lui). Exactement le même patron que le DSN Sentry ou la clé Google Maps absents :
l'app démarre et fonctionne normalement, elle n'enregistre simplement aucun token tant que
`eas init` n'a pas été lancé.

---

## 4. Bug 5.1 corrigé

**Symptôme :** un transporteur avec plus de 20 missions, dont les 20 plus récentes terminées, voyait
« aucune mission active » — son retour publié disparaissait de son propre écran.

**Cause :** trois hooks (`useMyMissions.ts`, `useCompletedMissions.ts`, `useMyReturnTrips.ts`)
appelaient `jobs/transporter/` sans le paramètre `?type=`, recevant l'union paginée à 20 des missions
assignées et des retours publiés — donc parfois seulement des lignes hors de leur intérêt sur la
première page.

**Correctif :** chacun des trois hooks utilise maintenant le filtre serveur livré en tâche 0.9
(`?type=assigned` pour les deux premiers, `?type=owned` pour le troisième), qui isole un ensemble
bien plus petit avant le filtre de statut côté client.

---

## 5. Ce qui reste ouvert

| Point | Nature | Détail |
|---|---|---|
| Vérification device (Lots 2, 3, 4) | Infra | Aucun build EAS possible sans compte Expo. Tout le code écrit cette session est vérifié par `typecheck`/`lint`/tests unitaires, jamais par un appareil réel. |
| `PUSH_NOTIFICATION_MODE=PRODUCTION` | Décision | Un flip de variable dans `render.yaml`, à faire une fois un appareil ayant confirmé une réception. |
| Tâche 4.9 (émission asynchrone) | Arbitrage BO | Accepter la latence ajoutée par `notify_corridor_alerts` dans le cycle HTTP, ou provisionner un worker (0 occurrence de `celery` dans le dépôt). |
| Vérification navigateur | Environnement | `npm run web` casse dès l'écran de recherche : `react-native-maps` (introduit avant cette session) est un module natif, incompatible avec la cible web. N'affecte pas Android/iOS. |

---

## 6. Vérification effectuée

**Backend** (`backend/venv/Scripts/python.exe manage.py test`, découvert dans cette session — le
Python global du poste a un `django.db.models.fields` cassé sous Python 3.14, sans rapport avec ce
travail) :

- **210 tests, 208 verts.** Les 2 échecs restants sont les scripts ad-hoc pré-existants
  `test_book_return.py`/`test_workflows.py` (encodage console Windows), déjà documentés comme
  non liés dans le plan du 07/08 — non touchés cette session.
- `python manage.py makemigrations --check --dry-run` : propre après génération de
  `0006_alter_devicetoken_token.py`.
- 6 tests nouveaux : `_send_expo` (succès, ticket d'erreur `DeviceNotRegistered`, autre erreur de
  ticket), `send_push_notification` (comptage sandbox vs production, désactivation de token).

**Mobile** (`npm run typecheck` / `lint` / `test:ci` / `npx expo-doctor` / `npx expo config`) :

- `typecheck` : 0 erreur.
- `lint` : 0 avertissement (`--max-warnings=0`).
- `test:ci` : **13 suites, 82 tests**, tous verts (16 nouveaux sur `notificationRoute.ts`).
- `expo-doctor` : 18/18.
- `expo config` : résout, y compris le plugin `expo-notifications` nouvellement déclaré.

**Non vérifié :** rendu visuel (voir §5, incompatibilité `react-native-maps`/web) et bout-en-bout sur
device réel (push, deep links, écrans natifs).

---

## 7. Fichiers touchés

**Backend**

- `notifications/push_service.py`, `serializers.py`, `models.py`, `tests.py`
- `notifications/migrations/0006_alter_devicetoken_token.py` (nouveau)
- `render.yaml`

**Mobile — nouveaux fichiers**

```
app/(app)/mes-demandes.tsx
app/(app)/messages/{_layout,index,[jobId]}.tsx
app/(app)/requests/{_layout,index,[jobId]}.tsx
app/(app)/transporteur/[id].tsx
app/(auth)/reset-password.tsx
src/core/push/usePushNotifications.ts
src/features/auth/api/usePasswordResetConfirm.ts
src/features/auth/components/ResetPasswordForm.tsx
src/features/missions/api/useTransporterCancel.ts
src/features/missions/components/TransporterCancelSheet.tsx
src/features/my-requests/api/useCancelRequest.ts
src/features/notifications/api/useRegisterDevice.ts
src/features/notifications/data/{notificationRoute.ts,notificationRoute.test.ts}
src/features/profiles/api/{dto,useTransporterProfile,useTransporterReviews}.ts
src/features/search/api/{useCorridorAlerts,useDeleteCorridorAlert}.ts
src/features/search/components/{CorridorAlertRow,CorridorAlertsPanel}.tsx
```

**Mobile — supprimés** : `app/(app)/messages.tsx`, `app/(app)/requests.tsx` (remplacés par les
dossiers ci-dessus).

**Mobile — modifiés** : `app.json`, `app/(app)/_layout.tsx`, `app/(app)/home.tsx`,
`app/(app)/search.tsx`, `package.json`, `src/core/{env.ts,deeplink/useDeepLinkRouting.ts}`,
`src/core/i18n/locales/{fr,ar}.json`, `src/features/auth/api/dto.ts`,
`src/features/missions/{api/useMyMissions.ts,api/useCompletedMissions.ts,components/MissionCard.tsx}`,
`src/features/my-requests/components/{MyRequestCard,MyRequestsList}.tsx`,
`src/features/notifications/{api/dto.ts,components/NotificationBell.tsx}`,
`src/features/requests/api/useMyReturnTrips.ts`, `src/features/search/{api/dto.ts,components/TripResultCard.tsx,data/corridors.test.ts}`,
`src/shared/ui/FloatingTabBar.tsx`.

**Documentation** : `docs/PLAN_ACHEVEMENT_MOBILE_2026-08-07.md` (Lots 3 et 4 marqués livrés, ligne 5.1
mise à jour).

---

## 8. Prochaine étape recommandée

Selon l'ordre d'exécution du plan lui-même (§8) : le Lot 3 chevauche déjà le Lot 5 (« tenue dans le
temps »), dont la tâche 5.1 est maintenant close. Les tâches restantes de ce même lot (pagination
`useInfiniteQuery`, `focusManager`/`onlineManager`, tests de `client.ts` et des gardes de navigation)
sont les candidates naturelles pour la suite, en parallèle de la provision d'un compte Expo/EAS —
seul blocage réel restant pour vérifier de bout en bout tout ce qui a été construit ici.
