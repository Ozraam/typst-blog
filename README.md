# Typst Blog

Moteur de blog auto-hébergé où les articles s'écrivent en **[Typst](https://typst.app)**. La mise en page que l'auteur voit dans l'éditeur est exactement celle que reçoivent les lecteurs : formules, tableaux, notes, figures, code…

## Fonctionnalités

**Lecture**
- Articles rendus en vectoriel (SVG) côté serveur : affichage instantané, sans WebAssembly pour les lecteurs.
- Texte sélectionnable et copiable, sommaire généré à partir des titres avec suivi de lecture, liens internes Typst fonctionnels.
- Export PDF à la demande, consultation de la source `.typ`.
- Recherche plein texte, filtres par tag, pagination, flux RSS (`/rss.xml`) et `sitemap.xml`.
- Thèmes clair et sombre, interface adaptée au mobile.

**Écriture**
- Éditeur CodeMirror avec coloration Typst, barre d'outils et raccourcis (`Ctrl+S`, `Ctrl+B`, `Ctrl+I`, `Ctrl+E`, `Ctrl+M`).
- Aperçu en direct compilé dans le navigateur (WebAssembly), avec le **même moteur** que le serveur.
- Erreurs Typst soulignées dans le code, avec numéro de ligne et astuces.
- Brouillons enregistrés automatiquement. Les articles publiés ne changent que sur « Mettre à jour ». Une copie de secours locale est conservée en cas de fermeture de l'onglet.
- Publication refusée tant que le document ne compile pas.
- Médiathèque : glisser-déposer, optimisation automatique des grandes images, insertion en un clic, compteur d'utilisation.

**Administration**
- Rôles administrateur / auteur : un auteur ne gère que ses articles et ses fichiers.
- Corbeille avec restauration, archivage, gestion des utilisateurs, paramètres du blog.
- Assistant de première installation.

## Démarrage

Prérequis : Node.js 22 ou plus récent.

```bash
npm install
npm run dev
```

L'application est servie sur [http://localhost:5173](http://localhost:5173). Au premier lancement, l'écran de configuration crée le compte administrateur.

Pour disposer d'un compte et d'articles de démonstration (`admin` / `admin123456`), lancez l'application une première fois puis :

```bash
npm run seed
```

### Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run check` | Vérification des types (svelte-check) |
| `npm test` | Tests (Vitest), sur une base temporaire |
| `npm run build` | Build de production dans `build/` (`node build` pour le lancer) |
| `npm run seed` | Données de démonstration |

## Déploiement (Docker)

```bash
cp .env.example .env   # puis adaptez les valeurs
docker compose up -d --build
```

Le blog écoute sur le port `PORT` (8088 par défaut). Tout l'état tient dans le volume `typst_data` : base SQLite, fichiers téléversés et polices Typst. Les polices sont téléchargées une seule fois au premier démarrage, ce qui demande un accès à Internet.

Variables principales (voir `.env.example`) :

- `ORIGIN` : URL publique du blog. **À définir si le blog n'est pas servi en HTTPS** (par exemple `http://raspberrypi.local:8088`), sinon le cookie de session est marqué `Secure` et la connexion échoue.
- `SITE_TITLE`, `SITE_DESCRIPTION`, `ALLOW_REGISTRATION` : valeurs initiales seulement. Elles se modifient ensuite dans *Administration › Paramètres*.

Un push sur `main` déclenche le déploiement automatique sur le Raspberry Pi (`.github/workflows/deploy.yml`, runner auto-hébergé). `deploy.sh` fait la même chose à la main.

## Écrire un article

Le titre, le résumé et les tags se saisissent dans l'éditeur. Le corps est du Typst standard, et ses titres forment le sommaire :

```typst
Une introduction…

= Première section

La formule d'Euler : $e^(i pi) + 1 = 0$.

#figure(
  image("/uploads/mon-schema-1a2b3c4d.png", width: 80%),
  caption: [Un schéma],
)

== Un détail

#table(
  columns: 2,
  table.header[*Propriété*][*Valeur*],
  [Superposition], [Oui],
)
```

Pour le web, chaque article reçoit une mise en page par défaut : page de 14 cm de large et de hauteur continue, texte en français justifié. Une règle `#set page(...)` ou `#set text(...)` dans l'article la remplace. L'export PDF utilise le format A4 standard de Typst.
