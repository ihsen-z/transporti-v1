// Le « verre » de la charte : des surfaces blanches semi-transparentes posées
// sur le dégradé bleu.
//
// Deux règles de la charte se traduisent directement ici :
//
//   1. « Le verre ne vit que sur le bleu. » Sur `neutral[50]` on repasse à des
//      cartes blanches opaques (Card). Ces tokens n'ont AUCUN sens ailleurs :
//      posé sur du blanc, un blanc à 14 % est invisible.
//   2. « Pas de backdrop-filter. » L'effet vient uniquement de l'alpha sur le
//      dégradé. C'est volontaire : React Native n'a pas de flou d'arrière-plan
//      sans dépendance native, et la charte préfère un rendu identique partout
//      à un flou qui coûte du GPU sur les Android d'entrée de gamme.
export const glass = {
  // .glass — la carte principale d'un écran immersif.
  card: {
    background: 'rgba(255,255,255,0.14)',
    border: 'rgba(255,255,255,0.28)',
  },
  // .glass-field — champ de saisie au repos.
  field: {
    background: 'rgba(255,255,255,0.16)',
    border: 'rgba(255,255,255,0.24)',
  },
  // .glass-field--focus — plus opaque, bord franc. Le focus se voit sans
  // anneau : sur le bleu, un halo clair serait noyé dans le dégradé.
  fieldFocus: {
    background: 'rgba(255,255,255,0.22)',
    border: 'rgba(255,255,255,0.55)',
    borderWidth: 1.5,
  },
  // .glass-chip — pastille, bouton icône, bouton `ghost` sur bleu.
  chip: {
    background: 'rgba(255,255,255,0.18)',
    border: 'rgba(255,255,255,0.30)',
  },
  // Tuile de KPI et bandeau d'information posés SUR une carte de verre : un
  // cran plus discrets que la carte, sinon ils la concurrencent.
  tile: 'rgba(255,255,255,0.14)',
  muted: 'rgba(255,255,255,0.10)',
  // Fond d'une jauge de progression sur bleu.
  track: 'rgba(255,255,255,0.22)',
} as const;

// Halos de lumière. La charte en autorise DEUX au maximum par écran, jamais
// centrés, toujours partiellement hors cadre — c'est ce débord qui fait qu'ils
// se lisent comme une source lumineuse et non comme une tache.
//
// `size` est le diamètre visible. En CSS la charte applique `blur(60px)` à un
// cercle plein ; en React Native il n'existe pas de filtre de flou, donc Halo
// dessine un dégradé radial (react-native-svg) dont la courbe d'opacité
// reproduit ce même étalement — voir Halo.tsx.
export const halos = {
  green: { color: '#2FAC55', opacity: 0.28, size: 260 },
  orange: { color: '#F97316', opacity: 0.3, size: 240 },
} as const;
