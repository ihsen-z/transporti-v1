// Config Expo dynamique. `app.json` reste la base statique et lisible ; ce
// fichier n'ajoute que ce qui doit venir de l'environnement.
//
// La clé Google Maps Android n'est jamais commitée : elle est lue depuis .env
// (gitignoré). Sans clé, la carte se monte mais rend une tuile grise — c'est
// le symptôme attendu, pas un bug d'intégration.
//
// Rappel : cette clé finit dans l'AndroidManifest de l'APK, donc lisible par
// qui décompile le binaire. La protection réelle se fait côté Google Cloud, en
// restreignant la clé au package `tn.transporti.app` et à l'empreinte SHA-1 du
// certificat de signature.
module.exports = ({ config }) => {
  const apiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? '';

  // Traçabilité du binaire. EAS expose EAS_BUILD_GIT_COMMIT_HASH et
  // EAS_BUILD_PROFILE pendant le build ; GitHub Actions expose GITHUB_SHA.
  // Sans ces valeurs, un rapport de crash ou un bug remonté par un testeur ne
  // désigne aucune version précise — le binaire n'est rattachable à rien.
  const commitSha = (
    process.env.EAS_BUILD_GIT_COMMIT_HASH ??
    process.env.GITHUB_SHA ??
    ''
  ).slice(0, 7);
  const buildProfile = process.env.EAS_BUILD_PROFILE ?? '';

  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: { apiKey },
      },
    },
    extra: {
      ...config.extra,
      // Le JS ne peut PAS lire android.config : la config publique servie à
      // l'app l'élague. On expose donc un booléen via `extra`, qui lui est
      // conservé. Un booléen, pas la clé : le JS n'a besoin que de savoir
      // s'il peut monter une carte.
      hasGoogleMapsKey: apiKey.length > 0,
      commitSha,
      buildProfile,
    },
  };
};
