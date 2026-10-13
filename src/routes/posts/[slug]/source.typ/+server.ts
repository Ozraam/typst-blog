import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { canEditPost, getPostBySlug } from '$lib/server/posts';

/** Raw Typst source of an article (used for "view source" and the in-browser PDF export). */
export const GET: RequestHandler = async ({ params, locals }) => {
	const post = getPostBySlug(params.slug);
	const visible =
		post && post.status !== 'trash' && (post.status === 'published' || post.status === 'archived' || canEditPost(locals.user, post));
	if (!post || !visible) error(404, 'Article introuvable');

	return new Response(post.content, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Content-Disposition': `inline; filename="${post.slug}.typ"`,
			'Cache-Control': 'private, no-cache'
		}
	});
};
