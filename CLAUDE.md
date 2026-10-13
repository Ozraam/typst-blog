# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Présentation

Moteur de blog auto-hébergé où les articles sont écrits en **Typst**. Stack : SvelteKit 2 + Svelte 5 (runes uniquement), `@sveltejs/adapter-node`, SQLite (`better-sqlite3` 12), compilation Typst en WebAssembly via `@myriaddreamin/typst.ts` 0.7, CodeMirror 6, icônes `@lucide/svelte`, polices auto-hébergées via `@fontsource-variable/*`. Toute l'UI et les messages d'erreur sont en **français** : conserver cette langue.

## Commandes

```bash
npm run dev          # serveur de dev (http://localhost:5173)
npm run check        # svelte-kit sync + svelte-check : doit rester à 0 erreur / 0 warning
npm test             # vitest run (tests/*.test.ts)
npx vitest run tests/svg.test.ts -t "neutralises"   # un fichier / un test
npm run build        # build Node dans build/, lancé avec `node build`
npm run seed         # admin/admin123456 + 2 articles (la base doit déjà exister : lancer l'app une fois)
```

- Les tests serveur créent un `DATA_DIR` temporaire (`tests/setup-env.ts`) **avant** d'importer `$lib/server/*` (imports dynamiques). Le cache de polices est partagé dans `node_modules/.cache/typst-blog-fonts`. Le premier lancement télécharge les polices et demande un accès réseau.
- Les variables d'environnement réelles priment sur `.env` (voir `db.ts`). Pour un serveur de dev isolé : `DATA_DIR=/tmp/x npm run dev`.

## Architecture

### Pipeline Typst (le cœur, réparti sur plusieurs fichiers)
- `src/lib/typst/engine.ts` est **isomorphe** : le même code compile sur le serveur et dans le navigateur, avec une instance `$typst` injectée. Il ajoute en tête un prélude web (page de 14 cm, hauteur auto, `lang: "fr"`, justification ; remplaçable par l'auteur via ses propres `#set`) et, en fin de document, une « sonde » `#metadata(...)<__blog_toc>` qui renvoie les titres avec leur position. Il utilise l'API bas niveau `compiler.runWithWorld` (compile → query → vector/pdf) : le `$typst.query` de haut niveau est cassé en 0.7. Les compilations sont sérialisées par une file, car typst.ts n'a qu'un compilateur global.
- Les numéros de ligne des diagnostics sont recalés en retirant les lignes du prélude (`wrapSource` / `normalizeDiagnostics`).
- `src/lib/typst/svg.ts` post-traite le SVG (même code des deux côtés) :
  - suppression des `<script>`, des `<style>` (qui fuient des sélecteurs globaux, remplacés par les règles `.typst-doc` d'`app.css`) et des attributs `on*` ;
  - filtrage des schémas d'URL des liens ;
  - conversion des sauts internes `handleTypstLocation(...)` en `data-jump="<y absolu en pt>"` ;
  - conversion de `<h5:div>` en `<div>`, ce qui rend la couche texte sélectionnable, et extraction du texte brut.
- Côté serveur, `src/lib/server/typst.ts` charge les WASM via `require.resolve('<pkg>/wasm')` et met les polices en cache disque dans `DATA_DIR/fonts` (téléchargées une à une, avec réessais). `RENDER_VERSION` est à **incrémenter dès que le prélude ou le post-traitement change** : les rendus plus anciens sont régénérés au démarrage (`hooks.server.ts` `init` → `refreshStaleRenders`) ou au premier affichage (`ensureRendered`).
- Côté client, `src/lib/typst/client.ts` importe les WASM avec `?url` (ressources Vite hachées). Toujours le charger par `import()` dynamique, pour que les pages de lecture ne téléchargent pas ~28 Mo de WASM.
- `src/lib/server/publishing.ts` (`savePost`) orchestre les écritures : un article publié ou archivé est rendu côté serveur à l'enregistrement, et une publication est refusée (422 + diagnostics) si le document ne compile pas. Une panne d'infrastructure (WASM, polices hors ligne) ne bloque pas la publication : `rendered_svg` reste NULL et la page publique compile alors dans le navigateur.

### Données
- `src/lib/server/db.ts` ouvre SQLite à l'import. Le schéma de base n'est **jamais modifié** : chaque évolution est une migration ajoutée en fin du tableau `migrations` (suivi via `PRAGMA user_version`).
- `posts` stocke la source (`content`) et le rendu mis en cache (`rendered_svg`, `toc_json`, `plain_text`, `word_count`, `render_version`). Toute modification du contenu d'un article sans nouveau rendu vide ces colonnes (`clearRender`).
- Le slug suit le titre tant que l'article n'a jamais été publié. Ensuite, il ne change que sur demande explicite. Dans l'éditeur, un slug vide signifie « déduit du titre » (`$lib/slug.ts` est partagé client/serveur).
- La recherche porte sur `plain_text`, avec échappement des jokers `LIKE`. Les listes ne chargent pas `content` (`SUMMARY_COLUMNS`).
- Les réglages du blog (`settings`) sont la source de vérité. Les variables `SITE_*` et `ALLOW_REGISTRATION` ne servent qu'à les initialiser.

### Auth et autorisations
- `hooks.server.ts` : session cookie → `locals.user`, assistant de premier lancement (tout redirige vers `/register` tant qu'aucun compte n'existe), garde de `/admin`, en-têtes de sécurité.
- Les routes `/api/*` et les actions de formulaire revérifient l'accès avec `requireEditor` / `requireAdmin` (`$lib/server/guards.ts`) et, pour les articles, `canEditPost` : un auteur ne voit et ne modifie que ses propres articles, l'admin voit tout.
- Connexion : limitation des échecs en mémoire, `safeRedirect` contre les redirections ouvertes, vérification à temps constant même pour un compte inexistant. Le flag `secure` du cookie dépend de `url.protocol`, donc de la variable `ORIGIN` derrière un proxy. Déconnexion en POST uniquement.
- `csrf.checkOrigin` est désactivé volontairement (voir le commentaire dans `svelte.config.js`).

### Front-end
- Design system dans `src/app.css` : tokens CSS (`--surface`, `--text-2`, `--accent`…) redéfinis sous `:root[data-theme='dark']`, plus les classes `.btn*`, `.input`, `.field`, `.card`, `.badge-<status>`, `.alert-*`, `.table` et `.admin-page`. Réutiliser ces tokens et classes plutôt que des couleurs en dur.
- Le thème est appliqué avant l'hydratation par un script inline dans `app.html`. Les composants qui dépendent du thème passent par le CSS plutôt que par un état JS (voir `ThemeToggle.svelte`).
- Retours utilisateur : `toast` (`$lib/ui/toast.svelte.ts`) et `confirm()` (`$lib/ui/confirm.svelte.ts`), rendus une seule fois dans le layout racine. Ne pas utiliser `alert()` / `confirm()` natifs. Pour les actions de formulaire en admin : `use:enhance={actionFeedback(...)}` (`$lib/ui/enhance.ts`), les actions renvoyant `{ message }` ou `fail(..., { error })`.
- Le layout racine n'affiche l'en-tête et le pied de page publics que hors de `/admin`, `/login` et `/register`. Le layout admin passe en mode plein écran (sans barre latérale) pour l'éditeur.
- L'éditeur (`src/lib/components/editor/PostEditor.svelte`) enregistre via l'API JSON (`POST /api/posts`, `PATCH|DELETE /api/posts/[id]`), et non via des actions de formulaire. Après la première sauvegarde d'un nouvel article, il fait un `replaceState` vers `/edit` pour éviter les doublons. L'autosave serveur ne concerne que les brouillons. Une copie locale (`localStorage`) sert à la récupération après crash.
- Médias : `POST /api/media` accepte une liste blanche d'extensions (`MEDIA_TYPES`). Les fichiers sont servis par `src/routes/uploads/[filename]` avec une CSP `sandbox`, `nosniff` et un cache immuable (noms uniques). Le moteur Typst ne résout que les chemins `/uploads/...`.

## Déploiement

- Docker : `node:22-alpine` multi-stage, volume `typst_data` → `/app/data` (base, uploads, polices). Variable `ORIGIN` requise si le blog n'est pas servi en HTTPS.
- **Un push sur `main` part directement en production** : `.github/workflows/deploy.yml` lance un runner self-hosted sur le Raspberry Pi, qui fait `git reset --hard` puis `docker compose up -d --build`. Travailler sur une branche.
- Développement local sous Node 24 : `better-sqlite3` doit rester en version ≥ 12 (la 11 plante au ramasse-miettes avec Node 24).
