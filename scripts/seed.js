// Seeds a development database with an admin account and two sample articles.
// Usage: start the app once (it creates the schema), then `npm run seed`.
import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR || './data';
const dbPath = path.join(DATA_DIR, 'blog.db');

if (!fs.existsSync(dbPath)) {
	console.error(`✗ ${dbPath} introuvable : lancez l'application une fois (npm run dev) pour créer la base.`);
	process.exit(1);
}

const db = new Database(dbPath);

function hashPassword(password) {
	const salt = crypto.randomBytes(16).toString('hex');
	return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

let admin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
if (!admin) {
	admin = { id: crypto.randomUUID() };
	const now = Date.now();
	db.prepare(
		`INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at)
		 VALUES (?, ?, ?, ?, 'admin', ?, ?)`
	).run(admin.id, 'admin', 'admin@typst-blog.local', hashPassword('admin123456'), now, now);
	console.log('✓ Compte administrateur créé : admin / admin123456');
}

const samples = [
	{
		title: 'Bienvenue sur votre blog Typst',
		slug: 'bienvenue-sur-votre-blog-typst',
		excerpt: 'Un tour rapide de ce que permet Typst pour publier des articles techniques et scientifiques soignés.',
		tags: ['typst', 'introduction'],
		daysAgo: 0,
		content: `Votre moteur de blog est opérationnel. Les articles sont rédigés en *Typst*, compilés en vectoriel et publiés tels quels : la typographie que vous voyez dans l'éditeur est exactement celle que liront vos lecteurs.

= Pourquoi Typst ?

Typst propose une syntaxe concise et expressive, idéale pour la rédaction technique :

- *Prise en main naturelle* : titres, listes et emphase s'écrivent comme en Markdown.
- *Mathématiques natives* : pas de préambule LaTeX, la notation reste lisible.
- *Programmable* : variables, fonctions et règles de style pour automatiser la mise en page.

= Des formules soignées

L'intégrale de Gauss#footnote[Du nom de Carl Friedrich Gauss (1777–1855).] s'écrit simplement :

$ integral_(-infinity)^(+infinity) e^(-x^2) dif x = sqrt(pi) $

Les matrices aussi :

$ A = mat(
  1, 2, 3;
  0, 1, 4;
  5, 6, 0;
) $

= Tableaux

#table(
  columns: (1fr, 2fr),
  table.header[*Fonctionnalité*][*Description*],
  [Aperçu en direct], [Compilation WebAssembly dans le navigateur, à chaque frappe],
  [Rendu serveur], [Les articles publiés sont compilés une fois et servis instantanément],
  [Export PDF], [Chaque lecteur peut télécharger l'article au format PDF],
)

= Pour commencer

Rendez-vous dans l'#link("/admin")[espace d'administration] pour écrire votre premier article.
`
	},
	{
		title: 'Écrire du code et des listes en Typst',
		slug: 'ecrire-du-code-et-des-listes-en-typst',
		excerpt: 'Blocs de code, listes numérotées et termes : les briques de base d’un article technique.',
		tags: ['typst', 'tutoriel'],
		daysAgo: 3,
		content: `Cet article présente quelques éléments de syntaxe courants.

= Blocs de code

Le code s'écrit entre trois accents graves, avec le langage pour la coloration :

\`\`\`python
def fibonacci(n: int) -> int:
    return n if n < 2 else fibonacci(n - 1) + fibonacci(n - 2)
\`\`\`

= Listes

+ Les listes numérotées utilisent le signe plus ;
+ les listes à puces, le tiret ;
+ les listes de termes, la barre oblique.

/ Typst: un système de composition moderne.
/ SVG: le format vectoriel utilisé pour l'affichage web.

= Références internes

Un titre peut porter une étiquette (\`<fin>\`) pour y renvoyer ailleurs : voir #link(<fin>)[la conclusion].

= Conclusion <fin>

Bonne écriture !
`
	}
];

const insertPost = db.prepare(
	`INSERT OR IGNORE INTO posts (id, title, slug, excerpt, content, status, published_at, created_at, updated_at, author_id)
	 VALUES (?, ?, ?, ?, ?, 'published', ?, ?, ?, ?)`
);

for (const sample of samples) {
	if (db.prepare('SELECT 1 FROM posts WHERE slug = ?').get(sample.slug)) continue;
	const id = crypto.randomUUID();
	const date = Date.now() - sample.daysAgo * 86_400_000;
	insertPost.run(id, sample.title, sample.slug, sample.excerpt, sample.content, date, date, date, admin.id);

	for (const name of sample.tags) {
		db.prepare('INSERT OR IGNORE INTO tags (id, name, slug) VALUES (?, ?, ?)').run(crypto.randomUUID(), name, name);
		const tag = db.prepare('SELECT id FROM tags WHERE slug = ?').get(name);
		db.prepare('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)').run(id, tag.id);
	}
	console.log(`✓ Article « ${sample.title} » créé`);
}

console.log('Données de démonstration prêtes (les articles seront compilés au premier affichage).');
