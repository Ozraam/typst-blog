import type { RequestHandler } from './$types';
import { Feed } from 'feed';
import { getSettings } from '$lib/server/db';
import { listPublishedPosts } from '$lib/server/posts';

export const GET: RequestHandler = async ({ url }) => {
	const { siteTitle, siteDescription } = getSettings();
	const siteUrl = url.origin;

	const feed = new Feed({
		title: siteTitle,
		description: siteDescription,
		id: `${siteUrl}/`,
		link: `${siteUrl}/`,
		language: 'fr',
		copyright: `© ${new Date().getFullYear()} ${siteTitle}`,
		generator: 'Typst Blog',
		feedLinks: { rss: `${siteUrl}/rss.xml` }
	});

	const { posts } = listPublishedPosts({ limit: 50 });
	for (const post of posts) {
		const postUrl = `${siteUrl}/posts/${post.slug}`;
		feed.addItem({
			title: post.title,
			id: postUrl,
			link: postUrl,
			description: post.summary,
			author: post.author_name ? [{ name: post.author_name }] : undefined,
			category: post.tags.map((name) => ({ name })),
			date: new Date(post.published_at ?? post.created_at)
		});
	}

	return new Response(feed.rss2(), {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=600'
		}
	});
};
