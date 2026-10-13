import crypto from 'node:crypto';
import { db } from './db';

export interface Post {
	id: string;
	title: string;
	slug: string;
	excerpt: string | null;
	content: string;
	rendered_svg: string | null;
	status: 'draft' | 'published' | 'archived' | 'trash';
	published_at: number | null;
	created_at: number;
	updated_at: number;
	author_id: string;
	author_name?: string;
	tags?: string[];
}

export interface Tag {
	id: string;
	name: string;
	slug: string;
	post_count?: number;
}

export function slugify(text: string): string {
	return text
		.toString()
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // remove diacritics
		.replace(/[^a-z0-9]+/g, '-') // replace non-alphanumeric with -
		.replace(/^-+|-+$/g, '') // trim -
		.substring(0, 80) || 'article';
}

export function generateUniqueSlug(title: string, excludePostId?: string): string {
	const base = slugify(title);
	let slug = base;
	let counter = 1;

	while (true) {
		const query = excludePostId
			? 'SELECT id FROM posts WHERE slug = ? AND id != ?'
			: 'SELECT id FROM posts WHERE slug = ?';
		const params = excludePostId ? [slug, excludePostId] : [slug];
		const existing = db.prepare(query).get(...params);

		if (!existing) {
			return slug;
		}
		counter++;
		slug = `${base}-${counter}`;
	}
}

export function syncPostTags(postId: string, tagNames: string[]): void {
	// Remove current associations
	db.prepare('DELETE FROM post_tags WHERE post_id = ?').run(postId);

	for (const rawName of tagNames) {
		const name = rawName.trim();
		if (!name) continue;
		const tagSlug = slugify(name);

		let tag = db.prepare('SELECT id FROM tags WHERE slug = ?').get(tagSlug) as { id: string } | undefined;
		if (!tag) {
			const tagId = crypto.randomUUID();
			db.prepare('INSERT INTO tags (id, name, slug) VALUES (?, ?, ?)').run(tagId, name, tagSlug);
			tag = { id: tagId };
		}

		db.prepare('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)').run(postId, tag.id);
	}
}

export function getPostTags(postId: string): string[] {
	const rows = db
		.prepare(
			`SELECT t.name FROM tags t
			 JOIN post_tags pt ON pt.tag_id = t.id
			 WHERE pt.post_id = ?
			 ORDER BY t.name ASC`
		)
		.all(postId) as { name: string }[];
	return rows.map((r) => r.name);
}

export function createPost(data: {
	title: string;
	slug?: string;
	excerpt?: string;
	content: string;
	rendered_svg?: string;
	status: 'draft' | 'published' | 'archived' | 'trash';
	tags?: string[];
	author_id: string;
	published_at?: number | null;
}): Post {
	const id = crypto.randomUUID();
	const now = Date.now();
	const slug = data.slug ? slugify(data.slug) : generateUniqueSlug(data.title);
	const published_at =
		data.status === 'published' ? (data.published_at || now) : null;

	db.prepare(
		`INSERT INTO posts (id, title, slug, excerpt, content, rendered_svg, status, published_at, created_at, updated_at, author_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).run(
		id,
		data.title.trim(),
		slug,
		data.excerpt?.trim() || null,
		data.content,
		data.rendered_svg || null,
		data.status,
		published_at,
		now,
		now,
		data.author_id
	);

	if (data.tags && data.tags.length > 0) {
		syncPostTags(id, data.tags);
	}

	return getPostById(id)!;
}

export function updatePost(
	id: string,
	data: {
		title?: string;
		slug?: string;
		excerpt?: string;
		content?: string;
		rendered_svg?: string;
		status?: 'draft' | 'published' | 'archived' | 'trash';
		tags?: string[];
		published_at?: number | null;
	}
): Post | null {
	const existing = getPostById(id);
	if (!existing) return null;

	const now = Date.now();
	let newSlug = existing.slug;
	if (data.slug && data.slug !== existing.slug) {
		newSlug = generateUniqueSlug(data.slug, id);
	} else if (data.title && data.title !== existing.title && !data.slug) {
		newSlug = generateUniqueSlug(data.title, id);
	}

	let published_at = existing.published_at;
	if (data.status === 'published' && !existing.published_at) {
		published_at = data.published_at || now;
	} else if (data.published_at !== undefined) {
		published_at = data.published_at;
	}

	db.prepare(
		`UPDATE posts SET
			title = COALESCE(?, title),
			slug = ?,
			excerpt = COALESCE(?, excerpt),
			content = COALESCE(?, content),
			rendered_svg = COALESCE(?, rendered_svg),
			status = COALESCE(?, status),
			published_at = ?,
			updated_at = ?
		 WHERE id = ?`
	).run(
		data.title?.trim() ?? null,
		newSlug,
		data.excerpt !== undefined ? data.excerpt.trim() : null,
		data.content ?? null,
		data.rendered_svg ?? null,
		data.status ?? null,
		published_at,
		now,
		id
	);

	if (data.tags !== undefined) {
		syncPostTags(id, data.tags);
	}

	return getPostById(id);
}

export function getPostById(id: string): Post | null {
	const row = db
		.prepare(
			`SELECT p.*, u.username as author_name
			 FROM posts p
			 JOIN users u ON p.author_id = u.id
			 WHERE p.id = ?`
		)
		.get(id) as Post | undefined;

	if (!row) return null;
	row.tags = getPostTags(row.id);
	return row;
}

export function getPostBySlug(slug: string): Post | null {
	const row = db
		.prepare(
			`SELECT p.*, u.username as author_name
			 FROM posts p
			 JOIN users u ON p.author_id = u.id
			 WHERE p.slug = ?`
		)
		.get(slug) as Post | undefined;

	if (!row) return null;
	row.tags = getPostTags(row.id);
	return row;
}

export function listPublishedPosts(options: {
	limit?: number;
	offset?: number;
	tag?: string;
	search?: string;
}): { posts: Post[]; total: number } {
	const limit = options.limit || 10;
	const offset = options.offset || 0;
	const params: (string | number)[] = ['published'];
	const whereClauses = [`p.status = ?`];

	if (options.tag) {
		whereClauses.push(
			`p.id IN (SELECT pt.post_id FROM post_tags pt JOIN tags t ON pt.tag_id = t.id WHERE t.slug = ? OR t.name = ?)`
		);
		params.push(slugify(options.tag), options.tag);
	}

	if (options.search && options.search.trim()) {
		whereClauses.push(`(p.title LIKE ? OR p.excerpt LIKE ? OR p.content LIKE ?)`);
		const searchParam = `%${options.search.trim()}%`;
		params.push(searchParam, searchParam, searchParam);
	}

	const whereSql = whereClauses.join(' AND ');

	const countRow = db
		.prepare(`SELECT COUNT(*) as count FROM posts p WHERE ${whereSql}`)
		.get(...params) as { count: number };

	const rows = db
		.prepare(
			`SELECT p.id, p.title, p.slug, p.excerpt, p.status, p.published_at, p.created_at, p.updated_at,
			        p.author_id, u.username as author_name
			 FROM posts p
			 JOIN users u ON p.author_id = u.id
			 WHERE ${whereSql}
			 ORDER BY p.published_at DESC, p.created_at DESC
			 LIMIT ? OFFSET ?`
		)
		.all(...params, limit, offset) as Post[];

	for (const row of rows) {
		row.tags = getPostTags(row.id);
	}

	return { posts: rows, total: countRow.count };
}

export function listAdminPosts(options: {
	status?: string;
	search?: string;
	limit?: number;
	offset?: number;
}): { posts: Post[]; total: number; counts: Record<string, number> } {
	const limit = options.limit || 20;
	const offset = options.offset || 0;
	const whereClauses: string[] = [];
	const params: (string | number)[] = [];

	if (options.status && options.status !== 'all') {
		whereClauses.push('p.status = ?');
		params.push(options.status);
	}

	if (options.search && options.search.trim()) {
		whereClauses.push('(p.title LIKE ? OR p.slug LIKE ?)');
		const searchParam = `%${options.search.trim()}%`;
		params.push(searchParam, searchParam);
	}

	const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

	const countRow = db
		.prepare(`SELECT COUNT(*) as count FROM posts p ${whereSql}`)
		.get(...params) as { count: number };

	const rows = db
		.prepare(
			`SELECT p.id, p.title, p.slug, p.excerpt, p.status, p.published_at, p.created_at, p.updated_at,
			        p.author_id, u.username as author_name
			 FROM posts p
			 JOIN users u ON p.author_id = u.id
			 ${whereSql}
			 ORDER BY p.updated_at DESC
			 LIMIT ? OFFSET ?`
		)
		.all(...params, limit, offset) as Post[];

	for (const row of rows) {
		row.tags = getPostTags(row.id);
	}

	// Status breakdown counts
	const countsRows = db
		.prepare('SELECT status, COUNT(*) as count FROM posts GROUP BY status')
		.all() as { status: string; count: number }[];

	const counts: Record<string, number> = {
		all: 0,
		published: 0,
		draft: 0,
		archived: 0,
		trash: 0
	};

	for (const r of countsRows) {
		counts[r.status] = r.count;
		counts.all += r.count;
	}

	return { posts: rows, total: countRow.count, counts };
}

export function trashPost(id: string): boolean {
	const info = db.prepare("UPDATE posts SET status = 'trash', updated_at = ? WHERE id = ?").run(Date.now(), id);
	return info.changes > 0;
}

export function restorePost(id: string): boolean {
	const info = db.prepare("UPDATE posts SET status = 'draft', updated_at = ? WHERE id = ?").run(Date.now(), id);
	return info.changes > 0;
}

export function deletePostPermanent(id: string): boolean {
	const info = db.prepare('DELETE FROM posts WHERE id = ?').run(id);
	return info.changes > 0;
}

export function getAllTags(): Tag[] {
	return db
		.prepare(
			`SELECT t.id, t.name, t.slug, COUNT(pt.post_id) as post_count
			 FROM tags t
			 LEFT JOIN post_tags pt ON pt.tag_id = t.id
			 LEFT JOIN posts p ON pt.post_id = p.id AND p.status = 'published'
			 GROUP BY t.id
			 ORDER BY post_count DESC, t.name ASC`
		)
		.all() as Tag[];
}
