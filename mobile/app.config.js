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
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? '',
      },
    },
  },
});
