# Sprint 3 — Marché arabophone (i18n complet + RTL propre + formats localisés)

## Contexte

L'audit UX/UI (docs/audit-ux-ui-transporti.html) a classé l'axe i18n/RTL comme **insuffisant** :
l'app est fonctionnelle en français/LTR mais **pas prête pour un public arabophone**.
Trois problèmes structurels :

1. **Couverture i18n ~1/3** — ~215 lignes de texte français en dur sur des pages/composants
   entiers (jobs/[id] 66 lignes, components/jobs/* 102, booking 30…) qui n'appellent jamais le
   hook `useAppI18n`. Un utilisateur arabe voit ces écrans en français.
2. **RTL fragile** — ~260 classes directionnelles physiques (`ml-`, `pr-`, `left-`…), dont seule
   une whitelist étroite est retournée par un patch CSS manuel bugué (globals.css 539-564).
   Tailwind 3.4.1 supporte nativement les propriétés logiques (`ms-/me-/ps-/pe-/start-/end-/…`).
3. **Formats non localisés** — `lib/format.ts` a des helpers à locale figée (`fr-TN`/`fr-FR`),
   ~25 fichiers appellent `toLocaleDateString('fr-…')` en dur, et `TND` est concaténé à la main
   ~45 fois.

Cible : l'app entièrement lisible et correctement miroitée en derja tunisien, sans lib i18n
externe (on étend le système maison) et en préservant le code-splitting du dictionnaire `ar`.

Décisions utilisateur : **sprint complet, phase par phase, commit après chaque unité** ;
**RTL = codemod mécanique + triage manuel**. CTA déjà décidé au Sprint 2 (vert accent).

## Décisions d'architecture

- **SSR de la locale : script inline anti-FOUC** (pas de cookie). L'app est entièrement
  client-side derrière un provider `"use client"` ; un cookie forcerait le dynamic rendering de
  toutes les routes sans bénéfice réel (le chunk `ar` reste async). Un `<script>` inline dans
  `<head>` pose `lang`/`dir` avant le premier paint → règle le flash blanc (`return null`) et le
  flash LTR. Trade-off assumé : ~100-300 ms de texte FR au 1er chargement en `ar` (mise en page
  déjà RTL), acceptable.
- **Interpolation** : mini-helper pur `interpolate(template, vars)` dans `lib/i18n/` pour les
  messages à variables (`"Supprimer la photo {n}"`). Hors de l'objet `t` (préserve le typage).
- **Parité fr/ar** : check compile-time par types (`parity.ts`, jamais importé par l'app, couvert
  par `tsc`) — garantit qu'ajouter une clé FR sans son équivalent AR casse `npm run typecheck`
  (déjà en husky/CI). Pas de tooling Node à ajouter.
- **Locale hors React** : variable module-scope `getCurrentLocale()`/`setCurrentLocale()`
  synchronisée par le provider, pour que `lib/format.ts` reste sans dépendance React et que les
  25+ call sites existants ne changent pas d'import.
- **RTL** : codemod `sed` sur les spacings toujours-directionnels (`ml/mr/pl/pr/text-left/right/
  border-l/r`) + triage manuel des `left-/right-` (positionnements) et des icônes
  (`rtl:-scale-x-100`). Suppression du patch CSS bugué dans le même commit que le codemod.

## Phases (12 commits, dans l'ordre)

### Phase 0 — Infrastructure (débloque tout)

**Commit A — `fix(i18n): SSR anti-FOUC locale + suppression du flash blanc`**
- `app/layout.tsx` : `<script>` inline dans `<head>` (lit localStorage, pose `lang="ar"`/`dir="rtl"`
  si besoin) + `suppressHydrationWarning` sur `<html>`.
- `lib/i18n/useAppI18n.tsx` : supprimer `if (!loaded) return null` (ligne 109) et l'état `loaded` ;
  lazy initializer localStorage pour `locale` ; appeler `setCurrentLocale(locale)` dans l'effet
  dir/lang. Le `dict` initial reste `fr` → pas de mismatch d'hydratation.
- `lib/i18n/currentLocale.ts` (nouveau) : `get/setCurrentLocale`.
- Vérif : `npm run build` (routes restent statiques `○`), toggle + hard-refresh en ar → pas de
  flash LTR ni de warning hydratation.

**Commit B — `feat(i18n): helper interpolate + check de parité fr/ar par types`**
- `lib/i18n/interpolate.ts` (nouveau, ~10 lignes).
- `lib/i18n/parity.ts` (nouveau, jamais importé par l'app) + correction des écarts fr/ar que
  `tsc` révélera (rappel audit : section morte `offersTabs` déjà repérée dans ar.ts).
- Vérif : `npm run typecheck`.

**Commit C — `refactor(format): currency/date/timeAgo locale-aware`**
- `lib/format.ts` : ajouter param optionnel `locale = getCurrentLocale()` à `formatCurrency`
  (alias `formatTND`), `formatDate`, `formatDateTime`, `formatTimeAgo(Short)`. Chiffres latins
  en ar (`ar-TN-u-nu-latn`), devise `د.ت` en ar / `TND` en fr. Map bilingue inline pour timeAgo
  (derja, ~8 strings — ne PAS importer ar.ts ici, code-splitting). Rétro-compatible (param
  optionnel → 25 call sites intacts).
- Vérif : typecheck + spot-check dashboard en ar.

### Phase 1 — Dette de traduction (~215 lignes, le cœur du sprint)

Pour chaque commit : ajouter le namespace dans `fr.ts` **et** `ar.ts` (parité forcée par le
commit B), câbler `useAppI18n()`, ajouter `"use client"` si absent, `interpolate` pour les
variables. Ton derja aligné sur l'existant d'ar.ts (ex. "التابلو متاعي", "لوّج على خدمة").

- **Commit D — `i18n(jobs): composants`** — components/jobs/* (JobActions, MovingDetailsForm,
  LocationPicker, JobPreview, JobTimeline, JobFeedCard, MissionStepper, PhotoUploader,
  TransportDetailsForm, JobFilters, JobTypeSelector).
- **Commit E — `i18n(jobs): pages`** — jobs/page, jobs/new, jobs/[id], jobs/[id]/book.
- **Commit F — `i18n(booking)`** — booking/[jobId] + components/booking/*.
- **Commit G — `i18n: verification, messages, offers, mots de passe`** — verification,
  messages + messages/[jobId], forgot/reset-password, OfferList/OfferCard.

### Phase 2 — RTL

- **Commit H — `refactor(rtl): spacings logiques (codemod) + suppression du patch CSS`** —
  `sed` `ml→ms / mr→me / pl→ps / pr→pe / text-left→text-start / text-right→text-end /
  border-l→border-s / border-r→border-e` sur app/ + components/ (gère négatifs et variants
  `hover:`/`md:`). Traiter à la main `rounded-bl/br` (bulles chat → `rounded-es/ee`) et l'unique
  `space-x-*`. Supprimer globals.css lignes 539-564 (whitelist + règles buguées), **conserver**
  Cairo/text-align body (529-537) et inputs/number-LTR/table-numbers (566-604).
  Vérif : `npm run build` + grep d'audit (doit tomber à ~0).
- **Commit I — `fix(rtl): triage des positionnements left-/right-`** — grille : `inset-0`,
  `left-1/2 + -translate-x-1/2` (centrage), `left-0 right-0` (pleine largeur), cartes Leaflet /
  react-easy-crop → **garder physique** ; badges/icônes d'input, drawers/sidebars → `start-/end-`
  + vérifier le sens du `translate-x` d'ouverture en RTL.
- **Commit J — `fix(rtl): miroir des icônes directionnelles`** — `rtl:-scale-x-100` sur les
  Arrow/Chevron *sémantiquement* directionnels (CTA suivant/retour, nav), pas les chevrons
  d'accordéon (déjà gérés par rotate-180) ni les contextes physiques.

### Phase 3 — Sweep formats

- **Commit K — `refactor: formatTND pour les "TND" concaténés`** — ~45 `${x} TND` →
  `formatTND(x)` (exclure placeholders d'inputs et strings déjà dans les dictionnaires).
- **Commit L — `refactor: centralisation du formatage des dates`** — ~25 `toLocaleDateString
  ('fr-…')` → `formatDate`/`formatDateTime`. Ajouter un param `options` à formatDate pour les
  call sites à options Intl spécifiques (weekday long…).

## Fichiers critiques

- `frontend/lib/i18n/useAppI18n.tsx` — provider (retirer `loaded`/`return null`, lazy init,
  sync `setCurrentLocale`).
- `frontend/app/layout.tsx` — script inline anti-FOUC + `suppressHydrationWarning`.
- `frontend/lib/format.ts` — helpers locale-aware (param optionnel rétro-compatible).
- `frontend/app/globals.css` — supprimer le patch RTL bugué (539-564), garder le reste.
- `frontend/lib/i18n/locales/fr.ts` + `ar.ts` — nouveaux namespaces de traduction (parité).
- Nouveaux : `lib/i18n/currentLocale.ts`, `lib/i18n/interpolate.ts`, `lib/i18n/parity.ts`.

## Vérification

- **À chaque commit** : `npm run typecheck` (parité fr/ar incluse dès commit B) + `npm run build`.
  Hooks husky/commitlint déjà en place (node_modules réparé au Sprint 2).
- **Audit greps → ~0** : classes physiques (`\b-?(ml|mr|pl|pr)-|\btext-(left|right)\b|
  \bborder-[lr]\b`), `TND` concaténé, `toLocaleDateString('fr`.
- **Test visuel RTL (fin Phase 2)** : dev server + toggle ar sur dashboard, wizard jobs/new,
  jobs/[id], booking, messages, verification, sidebar mobile+desktop. Astuce : forcer
  `document.documentElement.dir="rtl"` en restant en FR pour isoler les défauts de miroir.
  Points de contrôle : sidebar du bon côté + sens d'animation, flèches CTA, badges de notif,
  alignement inputs, prix/chiffres restant LTR, chevrons d'accordéon, tooltips. Premier
  chargement en ar cache vidé (Slow 3G) : `<html dir="rtl">` avant paint, pas d'erreur
  d'hydratation.
- Après le sprint : republier docs/audit-ux-ui-transporti.html avec l'axe i18n/RTL repassé au vert.
