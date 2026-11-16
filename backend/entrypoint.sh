#!/bin/sh
# Démarrage du conteneur : migrations, fichiers statiques, compte admin, puis
# le serveur. Toute étape qui échoue ARRÊTE le conteneur (set -e) : mieux vaut
# un déploiement en échec visible qu'un serveur qui tourne sur une base sans
# tables. Ce fichier doit garder des fins de ligne LF (il tourne sous Linux).
set -e

# Réglages d'abord, UNE fois et sans relance : une garde de production qui
# échoue (variable manquante) fait échouer l'import des réglages. Sans cette
# étape, migrate échouait 5 fois et le message accusait DATABASE_URL à tort.
# `check` ne se connecte pas à la base : il ne valide que la configuration.
echo "Checking settings..."
if ! python manage.py check; then
    echo "ERREUR : configuration refusée (message ci-dessus). Arrêt du conteneur." >&2
    echo "Voir docs/GUIDE_MISE_EN_PRODUCTION_RENDER.md, §5.2." >&2
    exit 1
fi

# La boucle ci-dessous ne sert plus qu'aux erreurs de connexion à la base.
# Neon met la base en pause : le réveil peut dépasser 10 secondes. On tente
# donc la migration 5 fois, avec une attente croissante (5, 10, 15, 20 s).
MAX_TENTATIVES=5
tentative=1
echo "Running migrations..."
until python manage.py migrate --noinput; do
    if [ "$tentative" -ge "$MAX_TENTATIVES" ]; then
        echo "ERREUR : migrate a échoué $MAX_TENTATIVES fois. Arrêt du conteneur." >&2
        echo "Vérifier DATABASE_URL (docs/GUIDE_MISE_EN_PRODUCTION_RENDER.md, §3 et §5.2)." >&2
        exit 1
    fi
    attente=$((tentative * 5))
    echo "migrate a échoué (tentative $tentative/$MAX_TENTATIVES), nouvel essai dans ${attente} s..."
    sleep "$attente"
    tentative=$((tentative + 1))
done

echo "Collecting static files..."
python manage.py collectstatic --noinput

# Premier compte administrateur : ne fait rien sans ADMIN_EMAIL/ADMIN_PASSWORD,
# ne touche jamais un compte existant, et n'échoue jamais (un mot de passe
# trop faible ou une adresse déjà prise ne donne qu'un avertissement :
# admin_audit/management/commands/creer_admin.py).
echo "Checking admin account..."
python manage.py creer_admin

# SECURITY: seed only on explicit opt-in — a production boot must never seed the DB.
if [ "$RUN_SEED" = "true" ]; then
    echo "Seeding test data (admin & test accounts)..."
    python manage.py seed_test_data || true
else
    echo "Skipping seed (set RUN_SEED=true to enable)."
fi

echo "Starting server..."
exec "$@"
