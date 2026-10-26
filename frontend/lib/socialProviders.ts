/**
 * Connexion Google / Facebook : quels fournisseurs sont vraiment branchés ?
 *
 * Sans identifiant client, un clic sur le bouton affichait « Google Client ID
 * not configured ». Un bouton qui ne mène nulle part coûte plus cher qu'un
 * bouton absent (même règle que l'application mobile, qui ne les rend pas) :
 * on n'affiche que les fournisseurs configurés.
 *
 * Next.js remplace ces variables NEXT_PUBLIC_* au build : il faut les écrire
 * en toutes lettres, pas via process.env[nom].
 */
export const FOURNISSEURS_SOCIAUX = {
  google: Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID),
  facebook: Boolean(process.env.NEXT_PUBLIC_FACEBOOK_APP_ID),
} as const;

/** Vrai si au moins un bouton social doit apparaître. */
export const CONNEXION_SOCIALE_ACTIVE =
  FOURNISSEURS_SOCIAUX.google || FOURNISSEURS_SOCIAUX.facebook;
