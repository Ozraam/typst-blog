import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR || './data';
const db = new Database(path.join(DATA_DIR, 'blog.db'));

function hashPassword(password) {
	const salt = crypto.randomBytes(16).toString('hex');
	const derivedKey = crypto.scryptSync(password, salt, 64);
	return `${salt}:${derivedKey.toString('hex')}`;
}

const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get();

let adminId;
if (adminCount.count === 0) {
	adminId = crypto.randomUUID();
	const now = Date.now();
	db.prepare(
		`INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`
	).run(
		adminId,
		'admin',
		'admin@typst-blog.local',
		hashPassword('admin123456'),
		'admin',
		now,
		now
	);
	console.log('✓ Compte administrateur créé : admin / admin123456');
} else {
	const user = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
	adminId = user.id;
}

const postCount = db.prepare('SELECT COUNT(*) as count FROM posts').get();
if (postCount.count === 0) {
	const postId = crypto.randomUUID();
	const now = Date.now();
	const sampleContent = `= Bienvenue sur votre Blog Typst !

Félicitations, votre moteur de blog *Typst Dynamique* est opérationnel.

Ce moteur vous permet de rédiger directement vos articles en syntaxe Typst avec coloration syntaxique, prévisualisation vectorielle instantanée en SVG, et export PDF haute fidélité.

== Pourquoi Typst pour le Web ?

Typst propose une syntaxe à la fois concise et expressive, idéale pour la rédaction technique et académique :

- *Prise en main naturelle* : balisage intuitif pour le texte brut, les titres et les listes.
- *Mathématiques natives* : pas besoin de configurations LaTeX lourdes, la syntaxe mathématique est fluide et lisible.
- *Rendu vectoriel pur* : les documents sont compilés directement en SVG ou PDF avec un respect typographique exemplaire.

== Exemples de formules mathématiques

Voici par exemple la célèbre intégrale de Gauss :

$ integral_(-infinity)^(+infinity) e^(-x^2) dif x = sqrt(pi) $

Ou encore une matrice vectorielle :

$ mat(
  1, 2, 3;
  0, 1, 4;
  5, 6, 0;
) $

== Tableaux et mise en page

Vous pouvez facilement insérer des tableaux structurés :

#table(
  columns: (1fr, 2fr, 1.5fr),
  [Fonctionnalité], [Description], [Statut],
  [Live Preview], [Compilation WebAssembly instantanée en SVG], [Opérationnel],
  [Export PDF], [Génération de PDF fidèle côté client], [Opérationnel],
  [Table des Matières], [Génération automatique depuis les titres], [Opérationnel]
)

== Pour commencer

Connectez-vous à l'espace d'administration pour rédiger vos articles, téléverser des images dans la médiathèque et personnaliser votre blog !
`;

	db.prepare(
		`INSERT INTO posts (id, title, slug, excerpt, content, status, published_at, created_at, updated_at, author_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).run(
		postId,
		'Bienvenue sur votre Blog Typst !',
		'bienvenue-sur-votre-blog-typst',
		'Découvrez la puissance de la syntaxe Typst pour la publication de vos articles techniques et scientifiques.',
		sampleContent,
		'published',
		now,
		now,
		now,
		adminId
	);

	// Tags
	const tags = ['typst', 'introduction', 'sciences'];
	for (const tag of tags) {
		const tagId = crypto.randomUUID();
		db.prepare('INSERT OR IGNORE INTO tags (id, name, slug) VALUES (?, ?, ?)').run(tagId, tag, tag);
		const existingTag = db.prepare('SELECT id FROM tags WHERE slug = ?').get(tag);
		db.prepare('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)').run(postId, existingTag.id);
	}

	console.log('✓ Article de démonstration créé : "Bienvenue sur votre Blog Typst !"');
}

console.log('🎉 Données de test prêtes.');
