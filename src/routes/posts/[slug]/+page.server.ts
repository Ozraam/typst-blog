import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { canEditPost, getAdjacentPosts, getPostBySlug, getPostToc, readingTime } from '$lib/server/posts';
import { ensureRendered } from '$lib/server/publishing';

export const load: PageServerLoad = async ({ params, locals }) => {
	const found = getPostBySlug(params.slug);
	const canEdit = !!found && canEditPost(locals.user, found);

	// Unpublished articles are only visible to the people who can edit them
	if (!found || (found.status !== 'published' && found.status !== 'archived' && !canEdit) || found.status === 'trash') {
		error(404, 'Article introuvable');
	}

	const post = await ensureRendered(found);

	return {
		post: {
			id: post.id,
			title: post.title,
			slug: post.slug,
			excerpt: post.excerpt,
			status: post.status,
			tags: post.tags,
			author_name: post.author_name ?? '',
			published_at: post.published_at,
			created_at: post.created_at,
			updated_at: post.updated_at
		},
		svg: post.rendered_svg,
		toc: getPostToc(post),
		// Only needed when the server could not render the article (client-side fallback)
		fallbackContent: post.rendered_svg ? null : post.content,
		readingTime: readingTime(post.word_count, post.content),
		adjacent: getAdjacentPosts(post),
		canEdit
	};
};
