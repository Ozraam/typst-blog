import { beforeAll, describe, expect, it } from 'vitest';
import { useTemporaryDataDir } from './setup-env';

useTemporaryDataDir();

const { db } = await import('../src/lib/server/db');
const auth = await import('../src/lib/server/auth');
const posts = await import('../src/lib/server/posts');
const { savePost } = await import('../src/lib/server/publishing');

let admin: { id: string; role: 'admin' };
let author: { id: string; role: 'author' };
let otherAuthor: { id: string; role: 'author' };

beforeAll(() => {
	admin = { id: auth.createUser({ username: 'admin', email: 'admin@example.com', password: 'motdepasse1', role: 'admin' }).id, role: 'admin' };
	author = { id: auth.createUser({ username: 'alice', email: 'alice@example.com', password: 'motdepasse2' }).id, role: 'author' };
	otherAuthor = { id: auth.createUser({ username: 'bob', email: 'bob@example.com', password: 'motdepasse3' }).id, role: 'author' };
});

describe('database', () => {
	it('applies migrations', () => {
		expect(db.pragma('user_version', { simple: true })).toBe(1);
		const columns = (db.prepare('PRAGMA table_info(posts)').all() as { name: string }[]).map((c) => c.name);
		expect(columns).toEqual(expect.arrayContaining(['toc_json', 'plain_text', 'word_count', 'render_version']));
	});
});

describe('auth', () => {
	it('authenticates by username or email, case-insensitively', () => {
		expect(auth.authenticate('ADMIN', 'motdepasse1')?.id).toBe(admin.id);
		expect(auth.authenticate('alice@example.com', 'motdepasse2')?.id).toBe(author.id);
		expect(auth.authenticate('admin', 'mauvais')).toBeNull();
		expect(auth.authenticate('inconnu', 'motdepasse1')).toBeNull();
	});

	it('manages sessions', () => {
		const session = auth.createSession(author.id);
		expect(auth.validateSession(session.sessionId).user?.username).toBe('alice');
		auth.destroySession(session.sessionId);
		expect(auth.validateSession(session.sessionId).user).toBeNull();
	});

	it('only allows relative redirects', () => {
		expect(auth.safeRedirect('/admin/posts?x=1')).toBe('/admin/posts?x=1');
		expect(auth.safeRedirect('https://evil.example')).toBe('/admin');
		expect(auth.safeRedirect('//evil.example')).toBe('/admin');
		expect(auth.safeRedirect('/\\evil.example')).toBe('/admin');
	});

	it('detects HTTPS from the proxy headers', () => {
		const req = (headers: Record<string, string>) => new Request('http://localhost/', { headers });
		expect(auth.isHttpsRequest(req({ 'x-forwarded-proto': 'https' }))).toBe(true);
		expect(auth.isHttpsRequest(req({ 'x-forwarded-proto': 'http' }))).toBe(false);
		expect(auth.isHttpsRequest(req({ 'cf-visitor': '{"scheme":"https"}' }))).toBe(true);
		expect(auth.isHttpsRequest(req({}))).toBe(false);
	});

	it('throttles repeated login failures', () => {
		const key = '127.0.0.1|alice';
		for (let i = 0; i < 8; i++) auth.recordLoginFailure(key);
		expect(auth.isLoginThrottled(key)).toBe(true);
		auth.clearLoginFailures(key);
		expect(auth.isLoginThrottled(key)).toBe(false);
	});

	it('validates credentials and uniqueness', () => {
		expect(auth.validateCredentials({ username: 'ab', email: 'a@b.fr' })).toMatch(/3 à 32/);
		expect(auth.validateCredentials({ username: 'carole', email: 'pas-un-email' })).toMatch(/email/);
		expect(auth.isUsernameOrEmailTaken('Alice', 'nouveau@example.com')).toBe(true);
		expect(auth.isUsernameOrEmailTaken('alice', 'alice@example.com', author.id)).toBe(false);
	});
});

describe('posts', () => {
	it('generates unique slugs and keeps published URLs stable', () => {
		const a = posts.createPost({ title: 'Équations différentielles', author_id: author.id });
		const b = posts.createPost({ title: 'Équations  différentielles !', author_id: author.id });
		expect(a.slug).toBe('equations-differentielles');
		expect(b.slug).toBe('equations-differentielles-2');

		// Drafts follow their title…
		expect(posts.updatePost(a.id, { title: 'Les équations' }).slug).toBe('les-equations');
		// …until they are published
		posts.setPostStatus(a.id, 'published');
		expect(posts.updatePost(a.id, { title: 'Autre titre' }).slug).toBe('les-equations');
		// An explicit slug always wins
		expect(posts.updatePost(a.id, { slug: 'Mon Slug' }).slug).toBe('mon-slug');
	});

	it('synchronises tags and removes orphans', () => {
		const p = posts.createPost({ title: 'Tags', tags: posts.parseTags(['Typst', 'typst', ' Maths ']), author_id: author.id });
		expect(p.tags).toEqual(['Maths', 'Typst']);
		posts.updatePost(p.id, { tags: ['Physique'] });
		expect(posts.getAllTagNames()).not.toContain('Maths');
	});

	it('restricts edition to the author and admins', () => {
		const p = posts.createPost({ title: 'Privé', author_id: author.id });
		expect(posts.canEditPost(author, p)).toBe(true);
		expect(posts.canEditPost(admin, p)).toBe(true);
		expect(posts.canEditPost(otherAuthor, p)).toBe(false);
		expect(posts.canEditPost({ id: 'x', role: 'reader' }, p)).toBe(false);

		const forBob = posts.listAdminPosts({ user: otherAuthor });
		expect(forBob.posts.every((post) => post.author_id === otherAuthor.id)).toBe(true);
	});

	it('escapes LIKE wildcards in searches', () => {
		posts.createPost({ title: '100% Typst', status: 'published', author_id: author.id });
		expect(posts.listPublishedPosts({ search: '100%' }).posts.map((p) => p.title)).toContain('100% Typst');
		expect(posts.listPublishedPosts({ search: '%' }).posts.every((p) => p.title.includes('%'))).toBe(true);
	});

	it('parses tag input', () => {
		expect(posts.parseTags('#a, b ,, A')).toEqual(['a', 'b']);
	});
});

describe('publishing (server-side Typst rendering)', () => {
	it('renders published articles with an outline', async () => {
		const { post } = await savePost(author, null, {
			title: 'Rendu serveur',
			status: 'published',
			content: '= Introduction\n\nDu texte avec $x^2$ et #link("javascript:alert(1)")[un lien].\n\n== Suite *grasse*\n\nFin.',
			tags: ['typst']
		});
		expect(post.rendered_svg).toContain('typst-doc');
		expect(post.rendered_svg).not.toContain('javascript:');
		expect(post.plain_text).toContain('Introduction');
		expect(post.word_count).toBeGreaterThan(5);

		const toc = posts.getPostToc(post);
		expect(toc.map((h) => [h.level, h.text])).toEqual([
			[1, 'Introduction'],
			[2, 'Suite grasse']
		]);
		expect(toc[1].y).toBeGreaterThan(toc[0].y);
	});

	it('refuses to publish a document with Typst errors', async () => {
		await expect(savePost(author, null, { title: 'Cassé', status: 'published', content: '#let x = (' })).rejects.toMatchObject({
			status: 422
		});
		// Drafts with errors can still be saved
		const { post } = await savePost(author, null, { title: 'Brouillon cassé', content: '#let x = (' });
		expect(post.status).toBe('draft');
	});

	it('reports diagnostics with source line numbers', async () => {
		try {
			await savePost(author, null, { title: 'Erreur ligne 3', status: 'published', content: 'a\nb\n#unknown-func()' });
			expect.unreachable();
		} catch (err) {
			expect((err as InstanceType<typeof posts.PostError>).diagnostics[0]).toMatchObject({ line: 3 });
		}
	});

	it('invalidates the render when a draft changes and protects other authors posts', async () => {
		const { post } = await savePost(author, null, { title: 'Invalidation', status: 'published', content: 'Un' });
		expect(post.rendered_svg).toBeTruthy();
		posts.setPostStatus(post.id, 'draft');
		const updated = posts.updatePost(post.id, { content: 'Deux' });
		expect(updated.rendered_svg).toBeNull();

		await expect(savePost(otherAuthor, post.id, { title: 'Piraté' })).rejects.toMatchObject({ status: 403 });
	});

	it('renders uploaded images referenced by the article', async () => {
		const png = Buffer.from(
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=',
			'base64'
		);
		const { saveUploadedFile } = await import('../src/lib/server/media');
		const media = await saveUploadedFile(new File([png], 'Mon Image.png', { type: 'image/png' }), author.id);
		expect(media.filename).toMatch(/^mon-image-[0-9a-f]{8}\.png$/);

		const { post } = await savePost(author, null, {
			title: 'Avec image',
			status: 'published',
			content: `#image("${media.url}", width: 2cm)`
		});
		expect(post.rendered_svg).toContain('data:image/png;base64');
	});
});
