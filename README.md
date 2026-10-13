# 📄 Moteur de Blog Typst Dynamique

Plateforme de blogging moderne, dynamique et auto-hébergée permettant de rédiger, prévisualiser en direct et publier des articles directement rédigés en syntaxe **Typst** via une interface web interactive.

---

## ✨ Fonctionnalités Clés

- **✍️ Rédacteur Typst interactif (Split-Screen)** :
  - Coloration syntaxique complète pour Typst (titres, gras, italique, mathématiques, tableaux, étiquettes, fonctions `#set`, `#image`, etc.).
  - Raccourcis clavier usuels (`Ctrl+S` / `Cmd+S` pour enregistrer, `Ctrl+B` pour le gras, `Ctrl+I` pour l'italique, etc.).
  - Prévisualisation en direct (*Live Preview*) avec compilation réactive vectorielle en **SVG** sans rechargement de page.
  - Défilement synchronisé (*scroll sync*) optionnel entre le code et le rendu.
  - Modes d'affichage commutables : Vue divisée (50/50), Éditeur seul, Prévisualisation seule.
  - Sauvegarde automatique en continu des brouillons (*crash recovery* en local et autosave périodique sur le serveur).

- **⚡ Rendu hybride ultra-rapide (Client WASM + Server SSR)** :
  - **Dans l'éditeur** : compilation instantanée 100% côté client via **WebAssembly** (`@myriaddreamin/typst.ts`), aucune latence réseau lors de la frappe.
  - **À la publication** : mise en cache du SVG vectoriel en base de données pour un affichage instantané des articles publics en Server-Side Rendering (SSR), sans imposer le téléchargement du runtime WASM aux simples lecteurs.
  - **Export PDF** : génération et téléchargement direct du PDF au rendu typographique parfait à la demande du lecteur.

- **📑 Gestion complète du cycle de vie des articles (CRUD)** :
  - Statuts multiples : `Brouillon` (*draft*), `Publié` (*published*), `Archivé` (*archived*), `Corbeille` (*trash*).
  - Suppression sécurisée en deux temps : mise à la corbeille (*soft-delete*) avant purge définitive irréversible.
  - Gestion automatique des slugs d'URL avec résolution des collisions.
  - Système de tags et catégories avec filtre en temps réel.
  - Table des matières (TOC) dynamique générée automatiquement à partir des titres Typst (`= Titre 1`, `== Titre 2`, etc.).

- **🖼️ Médiathèque intégrée** :
  - Téléversement d'images et documents par glisser-déposer (*drag and drop*).
  - Insertion directe du snippet Typst `#image("/uploads/...", width: 80%)` en un clic dans l'éditeur.

- **🔐 Authentification et Sécurité** :
  - Sessions sécurisées via cookies `HttpOnly` et `SameSite=Lax`.
  - Hachage de mot de passe cryptographique avec sel aléatoire (`scrypt`).
  - Assistant de première installation (*first-run wizard*) pour configurer le premier compte Administrateur sur base vierge.
  - Contrôle strict des inscriptions publiques (désactivables via variable d'environnement ou les paramètres).

- **📡 Flux RSS 2.0 & Déploiement Docker** :
  - Flux RSS généré automatiquement sur `/rss.xml`.
  - Image Docker multi-stage légère alpine avec volume persistant unique (`./data`).

---

## 🚀 Démarrage Rapide (Développement Local)

### Prérequis
- **Node.js** v20 ou supérieur.
- **npm** (inclus avec Node.js).

### Installation et lancement

```bash
# 1. Cloner le projet ou naviguer dans le dossier
cd typst-blog

# 2. Installer les dépendances
npm install

# 3. Lancer le serveur de développement
npm run dev
```

L'application est accessible à l'adresse [http://localhost:5173](http://localhost:5173).

Au premier démarrage, vous serez automatiquement redirigé vers l'écran d'initialisation pour créer le compte **Administrateur**.

---

## 🐳 Déploiement avec Docker

Un fichier `docker-compose.yml` prêt à l'emploi est fourni.

### 1. Variables d'environnement

Créez ou adaptez votre fichier `.env` :

```env
PORT=3000
DATA_DIR=/app/data
SESSION_SECRET=votre-cle-secrete-tres-longue-et-aleatoire
ALLOW_REGISTRATION=false
SITE_TITLE="Mon Blog Typst"
SITE_DESCRIPTION="Réflexions et articles scientifiques rédigés en Typst"
```

### 2. Lancement du conteneur

```bash
docker compose up -d --build
```

L'application démarre sur le port spécifié (par défaut `http://localhost:3000`). Les données SQLite et les fichiers médias sont conservés dans le volume persistant Docker `typst_data`.

---

## 📁 Structure du Projet

```
typst-blog/
├── Dockerfile                  # Construction multi-stage alpine
├── docker-compose.yml          # Déploiement conteneurisé avec volume persistant
├── package.json
├── svelte.config.js            # Configuration SvelteKit (Node adapter)
├── vite.config.ts              # Configuration Vite & WebAssembly
├── static/
│   └── typst/                  # Fichiers binaires WebAssembly Typst
└── src/
    ├── app.css                 # Système de design (thèmes clair/sombre, typographie)
    ├── hooks.server.ts         # Middleware d'authentification et route guards
    ├── lib/
    │   ├── components/         # Composants réutilisables (SplitEditor, Header, TOC, etc.)
    │   ├── server/             # Logique serveur (SQLite, Auth, Posts, Media, TOC)
    │   └── typst/              # Compilateur WebAssembly Typst & grammaire CodeMirror
    └── routes/
        ├── +page.svelte        # Accueil public (liste d'articles, filtre par tags, recherche)
        ├── posts/[slug]/       # Page de lecture d'article (SSR, TOC, export PDF)
        ├── rss.xml/            # Flux RSS 2.0
        ├── uploads/[filename]/ # Service sécurisé des fichiers médias
        ├── login/ & register/  # Écrans d'authentification et first-run wizard
        └── admin/              # Espace d'administration (Dashboard, Posts, Media, Settings)
```

---

## 📝 Exemple de syntaxe Typst dans les articles

```typst
= Introduction à la Mécanique Quantique

Cet article présente les concepts fondamentaux de la mécanique quantique.

== L'équation de Schrödinger

L'équation dépendante du temps s'écrit sous la forme suivante :

$ i hbar (partial psi) / (partial t) = hat(H) psi $

== Visualisation

#image("/uploads/mon-schema.png", width: 85%)

== Tableau comparatif

#table(
  columns: (1fr, 2fr),
  [Propriété], [Description],
  [Superposition], [L'état est une combinaison linéaire de plusieurs états de base],
  [Intrication], [Corrélation forte entre deux particules distantes]
)
```
