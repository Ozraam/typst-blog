import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getPostBySlug } from '$lib/server/posts';
import { extractTocFromTypst } from '$lib/server/toc';

export const load: PageServerLoad = async ({ params, locals }) => {
	const post = getPostBySlug(params.slug);

	if (!post) {
		throw error(404, 'Article non trouvé');
	}

	// Draft or archived articles can only be viewed by authenticated authors/admins
	if (post.status !== 'published') {
		const isAuthorized = locals.user && (locals.user.role === 'admin' || locals.user.role === 'author');
		if (!isAuthorized) {
			throw error(404, 'Article non trouvé');
		}
	}

	const toc = extractTocFromTypst(post.content);

	// Word count & reading time estimate
	const wordCount = post.content.split(/\s+/).filter(Boolean).length;
	const readingTime = Math.max(1, Math.ceil(wordCount / 200));

	return {
		post,
		toc,
		readingTime
	};
};
