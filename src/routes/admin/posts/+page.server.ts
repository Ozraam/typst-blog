import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { listAdminPosts, trashPost, restorePost, deletePostPermanent, updatePost } from '$lib/server/posts';

export const load: PageServerLoad = async ({ url }) => {
	const status = url.searchParams.get('status') || 'all';
	const search = url.searchParams.get('q') || '';
	const page = Math.max(1, parseInt(url.searchParams.get('p') || '1', 10));
	const limit = 20;
	const offset = (page - 1) * limit;

	const { posts, total, counts } = listAdminPosts({
		status,
		search,
		limit,
		offset
	});

	return {
		posts,
		total,
		counts,
		activeStatus: status,
		searchQuery: search,
		page,
		totalPages: Math.max(1, Math.ceil(total / limit))
	};
};

export const actions: Actions = {
	trash: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400);

		trashPost(id);
		return { success: true };
	},

	restore: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400);

		restorePost(id);
		return { success: true };
	},

	deletePermanent: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Seul un administrateur peut purger définitivement un article.' });
		}
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400);

		deletePostPermanent(id);
		return { success: true };
	},

	togglePublish: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const targetStatus = data.get('status')?.toString();
		if (!id || (targetStatus !== 'published' && targetStatus !== 'draft')) return fail(400);

		updatePost(id, {
			status: targetStatus as any
		});
		return { success: true };
	}
};
