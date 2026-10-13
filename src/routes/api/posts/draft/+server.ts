import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { createPost, updatePost, getPostById } from '$lib/server/posts';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'author')) {
		throw error(401, 'Non autorisé');
	}

	try {
		const body = await request.json();
		const { id, title, content, rendered_svg, excerpt, tags } = body;

		if (!title || !title.trim()) {
			return json({ error: 'Le titre est requis pour sauvegarder' }, { status: 400 });
		}

		let post;
		if (id) {
			const existing = getPostById(id);
			if (existing) {
				post = updatePost(id, {
					title,
					content,
					rendered_svg,
					excerpt,
					tags
				});
			} else {
				post = createPost({
					title,
					content: content || '',
					rendered_svg,
					excerpt,
					tags,
					status: 'draft',
					author_id: locals.user.id
				});
			}
		} else {
			post = createPost({
				title,
				content: content || '',
				rendered_svg,
				excerpt,
				tags,
				status: 'draft',
				author_id: locals.user.id
			});
		}

		return json({
			success: true,
			post: {
				id: post?.id,
				slug: post?.slug,
				updated_at: post?.updated_at
			}
		});
	} catch (e: any) {
		return json({ error: e.message || 'Erreur lors de la sauvegarde automatique' }, { status: 500 });
	}
};
