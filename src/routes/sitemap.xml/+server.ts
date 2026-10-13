import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
	const posts = db
		.prepare("SELECT slug, updated_at FROM posts WHERE status = 'published' ORDER BY published_at DESC")
		.all() as { slug: string; updated_at: number }[];

	const entries = [
		`<url><loc>${url.origin}/</loc></url>`,
		...posts.map(
			(p) =>
				`<url><loc>${url.origin}/posts/${encodeURIComponent(p.slug)}</loc><lastmod>${new Date(p.updated_at).toISOString()}</lastmod></url>`
		)
	];

	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join('')}</urlset>`,
		{ headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } }
	);
};
