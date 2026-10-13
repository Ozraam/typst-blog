import type { RequestHandler } from './$types';
import { Feed } from 'feed';
import { db } from '$lib/server/db';
import { listPublishedPosts } from '$lib/server/posts';

export const GET: RequestHandler = async ({ url }) => {
	const siteTitleRow = db.prepare("SELECT value FROM settings WHERE key = 'site_title'").get() as
		| { value: string }
		| undefined;
	const siteDescRow = db
		.prepare("SELECT value FROM settings WHERE key = 'site_description'")
		.get() as { value: string } | undefined;

	const siteTitle = siteTitleRow?.value || 'Typst Blog';
	const siteDescription = siteDescRow?.value || 'Moteur de blog moderne propulsé par Typst et SvelteKit';
	const siteUrl = url.origin;

	const feed = new Feed({
		title: siteTitle,
		description: siteDescription,
		id: siteUrl,
		link: siteUrl,
		language: 'fr',
		copyright: `All rights reserved ${new Date().getFullYear()}, ${siteTitle}`,
		generator: 'Typst Blog Engine'
	});

	const { posts } = listPublishedPosts({ limit: 50 });

	for (const post of posts) {
		const postUrl = `${siteUrl}/posts/${post.slug}`;
		feed.addItem({
			title: post.title,
			id: postUrl,
			link: postUrl,
			description: post.excerpt || post.title,
			content: post.excerpt || post.content.substring(0, 300),
			date: new Date(post.published_at || post.created_at)
		});
	}

	return new Response(feed.rss2(), {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
};
