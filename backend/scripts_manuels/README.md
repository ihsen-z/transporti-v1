# Scripts manuels

Trois scenarios de bout en bout, ecrits pour etre lances a la main contre une
base de developpement seedee :

    python scripts_manuels/workflows_manuel.py

Ce ne sont PAS des tests. Ils ne contiennent ni `TestCase` ni `def test_`, et
ils executent leurs mutations **au moment de l'import**.

Ils s'appelaient `backend/test_*.py`. A ce nom, le decouvreur de Django les
importait pendant `manage.py test` — c'est-a-dire **avant** la creation de la
base de test, donc contre la base configuree. Deux consequences :

  * `manage.py test` ne pouvait jamais etre vert, puisque le resultat dependait
    de l'etat courant des donnees de developpement. Une CI n'avait donc rien a
    garder ;
  * la suite de tests ecrivait dans la base de developpement. Sur une machine
    pointant une vraie base, elle y aurait ecrit aussi.

Le renommage les rend invisibles a la decouverte. Les relancer reste une
commande explicite, ce qu'ils ont toujours ete.
