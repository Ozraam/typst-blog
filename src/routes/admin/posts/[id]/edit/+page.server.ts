import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { canEditPost, getAllTagNames, getPostById, slugify } from '$lib/server/posts';
import { requireEditor } from '$lib/server/guards';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = requireEditor(locals);
	const post = getPostById(params.id);
	if (!post || !canEditPost(user, post)) error(404, 'Article introuvable');

	return {
		post: {
			id: post.id,
			title: post.title,
			// An empty slug means "derived from the title" (only possible before the first publication)
			slug: !post.published_at && post.slug.replace(/-\d+$/, '') === slugify(post.title) ? '' : post.slug,
			currentSlug: post.slug,
			excerpt: post.excerpt ?? '',
			content: post.content,
			status: post.status,
			tags: post.tags,
			published_at: post.published_at,
			updated_at: post.updated_at,
			author_name: post.author_name ?? ''
		},
		knownTags: getAllTagNames()
	};
};
