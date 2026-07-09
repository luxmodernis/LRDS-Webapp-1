# Les Rituels de Soin — Diptyque

Mini web app SCORM-compatible pour Diptyque : un panoramique illustré
scrollable où l'utilisateur explore une scène et clique sur des boutons
`+` pour ouvrir des fiches produit (modales). Utilisée pour la
formation des équipes en boutique (présentation des soins), packagée
pour être déposée sur la plateforme Teach on Mars (LMS).

**Statut** : projet en cours d'itération avec le client, déployé sur
Vercel pour review. Repo GitHub : `luxmodernis/LRDS-Webapp-1`.

## Contraintes techniques

- **Vanilla HTML/CSS/JS uniquement** — pas de framework, pas de build
  step, pas de CDN. Contrainte SCORM : le package doit tourner en local
  file:// ou sur un LMS sans dépendances externes.
- **Mobile-first**, conçu pour être vu sur téléphone (l'app simule un
  cadre de téléphone en desktop via l'outil position-editor).
- Un seul écran principal (`index.html`) + une modale à 2 pages qui
  slide horizontalement.

## Structure du projet

```
index.html          Écran principal + modale + password gate (temporaire)
style.css            Tout le CSS
script.js             Toute la logique app
scorm.js               Bridge SCORM/ToM (voir plus bas)
content/
  config.json           Positions des boutons + chemins des assets (PAS de texte)
  texts.html              TOUS les textes de l'app — fichier à traduire (voir plus bas)
  slides/panoramic.webp     Image panoramique
  modals/modal-01../09/       image.webp, label.png, packshot.png par soin
tools/
  position-editor/         Outil visuel pour repositionner les boutons +
  server.js                  Petit serveur Node local (port 3333) pour l'éditeur
```

## Points d'architecture à connaître

- **Panoramique** : `panoramic-track` a une largeur fixée en JS
  (`offsetWidth` de l'image) — sans ça les positions en % des boutons
  se calculent sur la largeur de l'écran au lieu de l'image, et tout
  se retrouve collé à gauche. Le scroll se fait par `transform:
  translate3d()`, jamais par `scrollLeft`.
- **Animation d'intro** (pan automatique au chargement) : transition
  CSS pure (pas de `requestAnimationFrame`), pour rester fluide même
  si le thread JS est occupé. Elle ne démarre qu'après validation du
  mot de passe (sinon elle se joue derrière l'écran de connexion et
  n'est jamais vue).
- **Ouverture de modale** : tout changement visuel sur le diapo
  (icône du bouton qui passe au blanc, apparition du bouton QUITTER)
  est retardé jusqu'à ce que la modale soit *totalement* opaque —
  sinon on l'aperçoit par transparence pendant le fondu d'ouverture.
- **Textes centralisés** (`content/texts.html`) : un seul fichier
  HTML structuré et commenté contient tous les textes (app + 9
  modales). C'est le fichier à dupliquer/traduire pour produire un
  package par langue sur Teach on Mars — voir les commentaires en
  tête du fichier. `config.json` ne contient aucun texte, seulement
  positions et chemins d'assets.
- **Préchargement** : toutes les images des modales sont préchargées
  au démarrage (`preloadModalImages`) pour que l'ouverture soit
  instantanée. `texts.html` et `config.json` sont fetchés une fois au
  démarrage aussi.
- **SCORM** (`scorm.js`) : détecte automatiquement Teach on Mars /
  SCORM 2004 / SCORM 1.2 en remontant la chaîne parent/opener. Reporte
  la progression (`visited/total`) à **chaque** modale visitée, pas
  seulement à la fin — si l'utilisateur quitte avant d'avoir tout vu,
  le LMS connaît son pourcentage exact. Hors LMS (test local/Vercel),
  toutes les méthodes sont des no-op silencieux. Inspiré du driver de
  `github.com/luxmodernis/template-scorm-project` (repo de référence
  pour l'intégration SCORM/ToM, à consulter si besoin d'étendre).
- **Password gate** : protection temporaire pour les reviews client
  (mot de passe en dur dans `script.js`, `PW_CORRECT`). À supprimer
  quand le projet sera validé — l'intro doit alors démarrer directement
  au chargement (retirer la dépendance à `passwordUnlocked` dans
  `maybeStartIntro()`).

## Outil d'édition des positions

`tools/position-editor/` — page visuelle pour repositionner les
boutons `+` à la main sur le panoramique (glisser-déposer), au lieu
d'éditer les `%` à la main dans `config.json`.

- **En local** : `node tools/server.js` puis
  `http://localhost:3333/tools/position-editor/` — le bouton
  "Valider les positions" écrit directement dans `content/config.json`
  via une petite API du serveur Node.
- **Sur Vercel** (lecture seule) : le même outil fonctionne mais le
  bouton devient "Copier le JSON" (presse-papier) au lieu d'écrire le
  fichier.

## Workflow de travail

- Toujours vérifier les changements visuels dans le navigateur
  (`mcp__Claude_Preview__*`) avant de commiter — décoder le mot de
  passe via `sessionStorage.setItem('lrds_unlocked','1')` pour sauter
  l'écran de connexion pendant les tests.
- Commits en français, un commit par changement logique, description
  du *pourquoi* pas juste du *quoi*.
- Push sur `main` directement (pas de branches) — c'est le
  fonctionnement adopté sur ce projet, déploiement auto sur Vercel.
