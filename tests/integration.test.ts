import assert from 'node:assert';
import { db } from '../src/lib/server/db';
import {
	createUser,
	getUserByUsernameOrEmail,
	verifyPassword,
	createSession,
	validateSession,
	destroySession,
	hasAnyUser
} from '../src/lib/server/auth';
import {
	createPost,
	getPostById,
	getPostBySlug,
	updatePost,
	trashPost,
	restorePost,
	deletePostPermanent,
	listPublishedPosts,
	listAdminPosts,
	generateUniqueSlug,
	getAllTags
} from '../src/lib/server/posts';
import { extractTocFromTypst } from '../src/lib/server/toc';

console.log('🧪 Démarrage des tests d’intégration du moteur de blog Typst...\n');

// 1. Test Auth & Users
console.log('1. Test de l’authentification et des utilisateurs...');
assert.strictEqual(typeof hasAnyUser(), 'boolean', 'hasAnyUser doit retourner un booléen');

const username = `admin_${Date.now()}`;
const email = `${username}@exemple.com`;

const testAdmin = createUser({
	username,
	email,
	password: 'superSecretPassword123!',
	role: 'admin'
});

assert.ok(testAdmin.id, 'L’utilisateur doit avoir un ID');
assert.strictEqual(testAdmin.username, username);
assert.strictEqual(testAdmin.role, 'admin');

const fetchedUser = getUserByUsernameOrEmail(username);
assert.ok(fetchedUser, 'L’utilisateur doit être récupérable par son nom');
assert.ok(verifyPassword('superSecretPassword123!', fetchedUser.password_hash), 'Le mot de passe doit être valide');
assert.strictEqual(verifyPassword('mauvaisMotDePasse', fetchedUser.password_hash), false, 'Un mauvais mot de passe doit échouer');

// Session tests
const { sessionId } = createSession(testAdmin.id);
const sessionResult = validateSession(sessionId);
assert.ok(sessionResult.user, 'La session doit être valide');
assert.strictEqual(sessionResult.user?.id, testAdmin.id);
destroySession(sessionId);
const deadSession = validateSession(sessionId);
assert.strictEqual(deadSession.user, null, 'Une session révoquée ne doit plus être valide');
console.log('✓ Auth & Sessions OK');

// 2. Test Posts CRUD & Slugs
console.log('2. Test de la gestion des articles (CRUD) et slugs...');
const typstSample = `= Mon Premier Article Typst

Introduction à Typst avec des mathématiques.

== Formules importantes

$ E = m c^2 $

== Conclusion

En résumé, Typst est rapide et vectoriel.
`;

const post1 = createPost({
	title: 'Introduction à Typst Test',
	content: typstSample,
	rendered_svg: '<svg><text>Typst Rendered</text></svg>',
	status: 'published',
	tags: ['typst', 'guide', 'science'],
	author_id: testAdmin.id
});

assert.ok(post1.id, 'L’article doit avoir un ID');
assert.strictEqual(post1.slug, 'introduction-a-typst-test', 'Le slug doit être slugifié proprement');
assert.strictEqual(post1.status, 'published');
assert.deepStrictEqual(post1.tags?.sort(), ['guide', 'science', 'typst'], 'Les tags doivent être associés');

// Slug collision test
const slugCollision = generateUniqueSlug('Introduction à Typst Test');
assert.strictEqual(slugCollision, 'introduction-a-typst-test-2', 'La collision de slug doit être résolue');

// Fetching
const fetchedBySlug = getPostBySlug('introduction-a-typst-test');
assert.ok(fetchedBySlug, 'L’article doit être récupérable par son slug');
assert.strictEqual(fetchedBySlug.title, 'Introduction à Typst Test');

// Update
const updated = updatePost(post1.id, {
	title: 'Introduction Complète à Typst Test',
	excerpt: 'Un guide exhaustif sur la rédaction en Typst'
});
assert.strictEqual(updated?.title, 'Introduction Complète à Typst Test');
assert.strictEqual(updated?.excerpt, 'Un guide exhaustif sur la rédaction en Typst');

// Trash, restore, purge
assert.ok(trashPost(post1.id), 'Mise à la corbeille');
const trashed = getPostById(post1.id);
assert.strictEqual(trashed?.status, 'trash');

assert.ok(restorePost(post1.id), 'Restauration de la corbeille');
const restored = getPostById(post1.id);
assert.strictEqual(restored?.status, 'draft');

// Update to published for public queries
updatePost(post1.id, { status: 'published' });

const publishedList = listPublishedPosts({ limit: 10 });
assert.ok(publishedList.total >= 1, 'Au moins un article publié dans la liste');
assert.ok(publishedList.posts.some(p => p.id === post1.id));

const adminList = listAdminPosts({ status: 'all' });
assert.ok(adminList.total >= 1);
assert.ok(adminList.counts.all >= 1);
console.log('✓ Posts CRUD & Slugs OK');

// 3. Test TOC Extraction
console.log('3. Test de l’extraction de la table des matières (TOC)...');
const toc = extractTocFromTypst(typstSample);
assert.strictEqual(toc.length, 3, 'Doit extraire 3 titres');
assert.strictEqual(toc[0].level, 1);
assert.strictEqual(toc[0].text, 'Mon Premier Article Typst');
assert.strictEqual(toc[1].level, 2);
assert.strictEqual(toc[1].text, 'Formules importantes');
assert.strictEqual(toc[2].level, 2);
assert.strictEqual(toc[2].text, 'Conclusion');
console.log('✓ Extraction TOC OK');

// 4. Test Tags
console.log('4. Test des tags et compteurs...');
const tags = getAllTags();
assert.ok(tags.length >= 3, 'Au moins 3 tags enregistrés');
assert.ok(tags.some(t => t.slug === 'typst'));
console.log('✓ Tags OK');

console.log('\n🎉 TOUS LES TESTS D’INTÉGRATION SONT VALIDÉS AVEC SUCCÈS !');
