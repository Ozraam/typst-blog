import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { getPostById, updatePost, trashPost, deletePostPermanent } from '$lib/server/posts';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const post = getPostById(params.id);
	if (!post) {
		throw error(404, 'Article non trouvé');
	}

	return {
		post,
		user: locals.user,
		justCreated: url.searchParams.has('created')
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401);

		const data = await request.formData();
		const title = data.get('title')?.toString() || '';
		const slug = data.get('slug')?.toString() || '';
		const excerpt = data.get('excerpt')?.toString() || '';
		const content = data.get('content')?.toString() || '';
		const rendered_svg = data.get('rendered_svg')?.toString() || '';
		const status = (data.get('status')?.toString() || 'draft') as 'draft' | 'published' | 'archived';
		const tagsRaw = data.get('tags')?.toString() || '';
		const tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);

		if (!title.trim()) {
			return fail(400, { error: 'Le titre de l’article est requis.' });
		}

		try {
			const updated = updatePost(params.id, {
				title,
				slug,
				excerpt,
				content,
				rendered_svg,
				status,
				tags
			});

			return { success: true, updated };
		} catch (e: any) {
			return fail(500, { error: e.message || 'Erreur lors de la mise à jour.' });
		}
	},

	trash: async ({ params, locals }) => {
		if (!locals.user) return fail(401);
		trashPost(params.id);
		throw redirect(303, '/admin/posts');
	},

	deletePermanent: async ({ params, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Seul un administrateur peut supprimer définitivement un article.' });
		}
		deletePostPermanent(params.id);
		throw redirect(303, '/admin/posts');
	}
};
