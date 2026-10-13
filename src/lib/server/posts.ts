import crypto from 'node:crypto';
import { db } from './db';
import type { TocEntry, Diagnostic } from '$lib/typst/engine';
import { slugify } from '$lib/slug';

export type PostStatus = 'draft' | 'published' | 'archived' | 'trash';
export const POST_STATUSES: PostStatus[] = ['draft', 'published', 'archived', 'trash'];

export interface Post {
	id: string;
	title: string;
	slug: string;
	excerpt: string | null;
	content: string;
	rendered_svg: string | null;
	toc_json: string | null;
	plain_text: string | null;
	word_count: number | null;
	render_version: number;
	status: PostStatus;
	published_at: number | null;
	created_at: number;
	updated_at: number;
	author_id: string;
	author_name?: string;
	tags: string[];
}

/** Lightweight shape used by listings (no content / render payload). */
export type PostSummary = Omit<Post, 'content' | 'rendered_svg' | 'toc_json' | 'plain_text'> & {
	summary: string;
};

export interface Tag {
	id: string;
	name: string;
	slug: string;
	post_count: number;
}

export interface SessionUser {
	id: string;
	role: 'admin' | 'author' | 'reader';
}

export class PostError extends Error {
	constructor(
		message: string,
		public status = 400,
		public diagnostics: Diagnostic[] = []
	) {
		super(message);
	}
}

const TAG_SEP = '\u001f';

export { slugify };

export function generateUniqueSlug(text: string, excludePostId?: string): string {
	const base = slugify(text);
	const exists = db.prepare('SELECT 1 FROM posts WHERE slug = ? AND id != ?');
	let slug = base;
	for (let counter = 2; exists.get(slug, excludePostId ?? ''); counter++) {
		slug = `${base}-${counter}`;
	}
	return slug;
}

export function parseTags(raw: string | string[] | undefined | null): string[] {
	const list = Array.isArray(raw) ? raw : (raw ?? '').split(',');
	const seen = new Set<string>();
	const tags: string[] = [];
	for (const item of list) {
		const name = String(item).trim().replace(/^#/, '').slice(0, 40);
		if (name && !seen.has(slugify(name))) {
			seen.add(slugify(name));
			tags.push(name);
		}
	}
	return tags.slice(0, 12);
}

function syncPostTags(postId: string, tagNames: string[]): void {
	db.prepare('DELETE FROM post_tags WHERE post_id = ?').run(postId);
	const findTag = db.prepare('SELECT id FROM tags WHERE slug = ?');
	const insertTag = db.prepare('INSERT INTO tags (id, name, slug) VALUES (?, ?, ?)');
	const link = db.prepare('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)');

	for (const name of tagNames) {
		const tagSlug = slugify(name);
		let tag = findTag.get(tagSlug) as { id: string } | undefined;
		if (!tag) {
			tag = { id: crypto.randomUUID() };
			insertTag.run(tag.id, name, tagSlug);
		}
		link.run(postId, tag.id);
	}
	db.prepare('DELETE FROM tags WHERE id NOT IN (SELECT tag_id FROM post_tags)').run();
}

const TAGS_COLUMN = `(SELECT GROUP_CONCAT(t.name, '${TAG_SEP}') FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id = p.id) AS tags_concat`;

type Row<T> = Omit<T, 'tags'> & { tags_concat: string | null };

function withTags<T extends { tags: string[] }>(row: Row<T>): T {
	const { tags_concat, ...rest } = row;
	const tags = tags_concat ? tags_concat.split(TAG_SEP).sort((a, b) => a.localeCompare(b, 'fr')) : [];
	return { ...(rest as unknown as T), tags };
}

function summarize(text: string | null, title: string, length = 220): string {
	if (!text) return '';
	let body = text.trim();
	// The article usually starts by repeating its title as a heading
	if (body.toLowerCase().startsWith(title.toLowerCase())) body = body.slice(title.length).trim();
	if (body.length <= length) return body;
	const cut = body.slice(0, length);
	return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), length - 30)).trim()}…`;
}

const SUMMARY_COLUMNS = `p.id, p.title, p.slug, p.excerpt, p.status, p.published_at, p.created_at, p.updated_at,
	p.author_id, p.word_count, p.render_version, u.username AS author_name,
	SUBSTR(COALESCE(p.plain_text, ''), 1, 400) AS plain_head, ${TAGS_COLUMN}`;

function toSummary(row: Row<PostSummary> & { plain_head: string }): PostSummary {
	const { plain_head, ...rest } = row;
	const post = withTags<PostSummary>(rest as Row<PostSummary>);
	post.summary = post.excerpt?.trim() || summarize(plain_head, post.title);
	return post;
}

function likePattern(search: string): string {
	return `%${search.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export function getPostById(id: string): Post | null {
	const row = db
		.prepare(
			`SELECT p.*, u.username AS author_name, ${TAGS_COLUMN}
			 FROM posts p JOIN users u ON p.author_id = u.id WHERE p.id = ?`
		)
		.get(id) as Row<Post> | undefined;
	return row ? withTags<Post>(row) : null;
}

export function getPostBySlug(slug: string): Post | null {
	const row = db
		.prepare(
			`SELECT p.*, u.username AS author_name, ${TAGS_COLUMN}
			 FROM posts p JOIN users u ON p.author_id = u.id WHERE p.slug = ?`
		)
		.get(slug) as Row<Post> | undefined;
	return row ? withTags<Post>(row) : null;
}

export function getPostToc(post: Pick<Post, 'toc_json'>): TocEntry[] {
	try {
		return post.toc_json ? (JSON.parse(post.toc_json) as TocEntry[]) : [];
	} catch {
		return [];
	}
}

export function canEditPost(user: SessionUser | null | undefined, post: Pick<Post, 'author_id'>): boolean {
	if (!user) return false;
	return user.role === 'admin' || (user.role === 'author' && post.author_id === user.id);
}

export function listPublishedPosts(options: {
	limit?: number;
	offset?: number;
	tag?: string;
	search?: string;
}): { posts: PostSummary[]; total: number } {
	const limit = options.limit ?? 10;
	const offset = options.offset ?? 0;
	const params: (string | number)[] = ['published'];
	const where = ['p.status = ?'];

	if (options.tag) {
		where.push('p.id IN (SELECT pt.post_id FROM post_tags pt JOIN tags t ON pt.tag_id = t.id WHERE t.slug = ?)');
		params.push(slugify(options.tag));
	}

	if (options.search?.trim()) {
		where.push(
			`(p.title LIKE ? ESCAPE '\\' OR p.excerpt LIKE ? ESCAPE '\\' OR COALESCE(p.plain_text, p.content) LIKE ? ESCAPE '\\')`
		);
		const pattern = likePattern(options.search);
		params.push(pattern, pattern, pattern);
	}

	const whereSql = where.join(' AND ');
	const { count } = db.prepare(`SELECT COUNT(*) AS count FROM posts p WHERE ${whereSql}`).get(...params) as {
		count: number;
	};

	const rows = db
		.prepare(
			`SELECT ${SUMMARY_COLUMNS}
			 FROM posts p JOIN users u ON p.author_id = u.id
			 WHERE ${whereSql}
			 ORDER BY p.published_at DESC, p.created_at DESC
			 LIMIT ? OFFSET ?`
		)
		.all(...params, limit, offset) as Array<Row<PostSummary> & { plain_head: string }>;

	return { posts: rows.map(toSummary), total: count };
}

export function listAdminPosts(options: {
	user: SessionUser;
	status?: string;
	search?: string;
	limit?: number;
	offset?: number;
}): { posts: PostSummary[]; total: number; counts: Record<'all' | PostStatus, number> } {
	const limit = options.limit ?? 20;
	const offset = options.offset ?? 0;
	const scope: string[] = [];
	const scopeParams: string[] = [];

	// Authors only manage their own articles
	if (options.user.role !== 'admin') {
		scope.push('p.author_id = ?');
		scopeParams.push(options.user.id);
	}

	const where = [...scope];
	const params: (string | number)[] = [...scopeParams];

	if (options.status && POST_STATUSES.includes(options.status as PostStatus)) {
		where.push('p.status = ?');
		params.push(options.status);
	} else {
		where.push("p.status != 'trash'");
	}

	if (options.search?.trim()) {
		where.push(`(p.title LIKE ? ESCAPE '\\' OR p.slug LIKE ? ESCAPE '\\')`);
		const pattern = likePattern(options.search);
		params.push(pattern, pattern);
	}

	const whereSql = `WHERE ${where.join(' AND ')}`;
	const { count } = db.prepare(`SELECT COUNT(*) AS count FROM posts p ${whereSql}`).get(...params) as {
		count: number;
	};

	const rows = db
		.prepare(
			`SELECT ${SUMMARY_COLUMNS}
			 FROM posts p JOIN users u ON p.author_id = u.id
			 ${whereSql}
			 ORDER BY p.updated_at DESC
			 LIMIT ? OFFSET ?`
		)
		.all(...params, limit, offset) as Array<Row<PostSummary> & { plain_head: string }>;

	const countRows = db
		.prepare(
			`SELECT status, COUNT(*) AS count FROM posts p ${scope.length ? `WHERE ${scope.join(' AND ')}` : ''} GROUP BY status`
		)
		.all(...scopeParams) as { status: PostStatus; count: number }[];

	const counts: Record<'all' | PostStatus, number> = { all: 0, published: 0, draft: 0, archived: 0, trash: 0 };
	for (const r of countRows) {
		counts[r.status] = r.count;
		if (r.status !== 'trash') counts.all += r.count;
	}

	return { posts: rows.map(toSummary), total: count, counts };
}

export interface PostInput {
	title?: string;
	slug?: string;
	excerpt?: string;
	content?: string;
	status?: Exclude<PostStatus, 'trash'>;
	tags?: string[];
}

export interface RenderFields {
	rendered_svg: string | null;
	toc_json: string | null;
	plain_text: string | null;
	word_count: number | null;
	render_version: number;
}

export function createPost(data: PostInput & { title: string; author_id: string }, render?: RenderFields): Post {
	const id = crypto.randomUUID();
	const now = Date.now();
	const status = data.status ?? 'draft';
	const title = data.title.trim();
	if (!title) throw new PostError('Le titre est requis.');

	db.transaction(() => {
		db.prepare(
			`INSERT INTO posts (id, title, slug, excerpt, content, status, published_at, created_at, updated_at, author_id)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		).run(
			id,
			title,
			generateUniqueSlug(data.slug?.trim() || title),
			data.excerpt?.trim() || null,
			data.content ?? '',
			status,
			status === 'published' ? now : null,
			now,
			now,
			data.author_id
		);
		if (render) saveRender(id, render);
		syncPostTags(id, data.tags ?? []);
	})();

	return getPostById(id)!;
}

export function updatePost(id: string, data: PostInput, render?: RenderFields): Post {
	const existing = getPostById(id);
	if (!existing) throw new PostError('Article introuvable.', 404);

	const title = data.title !== undefined ? data.title.trim() : existing.title;
	if (!title) throw new PostError('Le titre est requis.');

	const status = data.status ?? existing.status;
	const wasPublished = existing.published_at !== null;

	// Published URLs are stable: the slug only follows the title until the first publication.
	let slug = existing.slug;
	if (data.slug?.trim()) {
		if (slugify(data.slug) !== existing.slug) slug = generateUniqueSlug(data.slug, id);
	} else if (data.slug !== undefined || data.title !== undefined) {
		if (!wasPublished && slugify(title) !== existing.slug) slug = generateUniqueSlug(title, id);
	}

	const contentChanged = data.content !== undefined && data.content !== existing.content;

	db.transaction(() => {
		db.prepare(
			`UPDATE posts SET title = ?, slug = ?, excerpt = ?, content = ?, status = ?,
				published_at = ?, updated_at = ?
			 WHERE id = ?`
		).run(
			title,
			slug,
			data.excerpt !== undefined ? data.excerpt.trim() || null : existing.excerpt,
			data.content ?? existing.content,
			status,
			status === 'published' && !wasPublished ? Date.now() : existing.published_at,
			Date.now(),
			id
		);
		if (render) saveRender(id, render);
		else if (contentChanged) clearRender(id);
		if (data.tags !== undefined) syncPostTags(id, data.tags);
	})();

	return getPostById(id)!;
}

export function saveRender(id: string, render: RenderFields): void {
	db.prepare(
		`UPDATE posts SET rendered_svg = ?, toc_json = ?, plain_text = ?, word_count = ?, render_version = ? WHERE id = ?`
	).run(render.rendered_svg, render.toc_json, render.plain_text, render.word_count, render.render_version, id);
}

function clearRender(id: string): void {
	db.prepare(
		'UPDATE posts SET rendered_svg = NULL, toc_json = NULL, plain_text = NULL, word_count = NULL, render_version = 0 WHERE id = ?'
	).run(id);
}

export function setPostStatus(id: string, status: PostStatus): boolean {
	const info = db
		.prepare(
			`UPDATE posts SET status = ?, updated_at = ?,
				published_at = CASE WHEN ? = 'published' AND published_at IS NULL THEN ? ELSE published_at END
			 WHERE id = ?`
		)
		.run(status, Date.now(), status, Date.now(), id);
	return info.changes > 0;
}

export function deletePostPermanent(id: string): boolean {
	const deleted = db.transaction(() => {
		const changes = db.prepare('DELETE FROM posts WHERE id = ?').run(id).changes;
		db.prepare('DELETE FROM tags WHERE id NOT IN (SELECT tag_id FROM post_tags)').run();
		return changes;
	})();
	return deleted > 0;
}

/** Published posts whose stored render is missing or outdated. */
export function listStaleRenders(renderVersion: number): { id: string; content: string }[] {
	return db
		.prepare(
			`SELECT id, content FROM posts
			 WHERE status IN ('published', 'archived') AND (rendered_svg IS NULL OR render_version < ?)
			 ORDER BY published_at DESC`
		)
		.all(renderVersion) as { id: string; content: string }[];
}

export function getPublicTags(): Tag[] {
	return db
		.prepare(
			`SELECT t.id, t.name, t.slug, COUNT(p.id) AS post_count
			 FROM tags t
			 JOIN post_tags pt ON pt.tag_id = t.id
			 JOIN posts p ON p.id = pt.post_id AND p.status = 'published'
			 GROUP BY t.id
			 ORDER BY post_count DESC, t.name ASC`
		)
		.all() as Tag[];
}

export function getAllTagNames(): string[] {
	return (db.prepare('SELECT name FROM tags ORDER BY name ASC').all() as { name: string }[]).map((t) => t.name);
}

export function getAdjacentPosts(post: Pick<Post, 'id' | 'published_at'>): {
	previous: { title: string; slug: string } | null;
	next: { title: string; slug: string } | null;
} {
	if (!post.published_at) return { previous: null, next: null };
	const previous = db
		.prepare(
			`SELECT title, slug FROM posts WHERE status = 'published' AND id != ? AND published_at <= ?
			 ORDER BY published_at DESC LIMIT 1`
		)
		.get(post.id, post.published_at) as { title: string; slug: string } | undefined;
	const next = db
		.prepare(
			`SELECT title, slug FROM posts WHERE status = 'published' AND id != ? AND published_at > ?
			 ORDER BY published_at ASC LIMIT 1`
		)
		.get(post.id, post.published_at) as { title: string; slug: string } | undefined;
	return { previous: previous ?? null, next: next ?? null };
}

export function readingTime(wordCount: number | null | undefined, fallbackText = ''): number {
	const words = wordCount ?? fallbackText.split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / 220));
}
