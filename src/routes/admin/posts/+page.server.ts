import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { canEditPost, deletePostPermanent, getPostById, listAdminPosts, setPostStatus } from '$lib/server/posts';
import { requireEditor } from '$lib/server/guards';
import { savePost } from '$lib/server/publishing';
import { PostError } from '$lib/server/posts';

const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ url, locals }) => {
	const user = requireEditor(locals);
	const status = url.searchParams.get('status') ?? 'all';
	const search = url.searchParams.get('q') ?? '';
	const page = Math.max(1, parseInt(url.searchParams.get('p') ?? '1', 10) || 1);

	const { posts, total, counts } = listAdminPosts({ user, status, search, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });

	return {
		posts,
		total,
		counts,
		activeStatus: status,
		searchQuery: search,
		page,
		totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE))
	};
};

async function editablePost(request: Request, locals: App.Locals) {
	const user = requireEditor(locals);
	const id = (await request.formData()).get('id')?.toString() ?? '';
	const post = getPostById(id);
	if (!post || !canEditPost(user, post)) return { user, post: null };
	return { user, post };
}

export const actions: Actions = {
	trash: async ({ request, locals }) => {
		const { post } = await editablePost(request, locals);
		if (!post) return fail(404, { error: 'Article introuvable.' });
		setPostStatus(post.id, 'trash');
		return { message: `« ${post.title} » a été placé dans la corbeille.` };
	},

	restore: async ({ request, locals }) => {
		const { post } = await editablePost(request, locals);
		if (!post) return fail(404, { error: 'Article introuvable.' });
		setPostStatus(post.id, 'draft');
		return { message: `« ${post.title} » a été restauré en brouillon.` };
	},

	deletePermanent: async ({ request, locals }) => {
		const { user, post } = await editablePost(request, locals);
		if (user.role !== 'admin') return fail(403, { error: 'Seul un administrateur peut supprimer définitivement un article.' });
		if (!post || post.status !== 'trash') return fail(404, { error: 'Article introuvable dans la corbeille.' });
		deletePostPermanent(post.id);
		return { message: `« ${post.title} » a été supprimé définitivement.` };
	},

	publish: async ({ request, locals }) => {
		const { user, post } = await editablePost(request, locals);
		if (!post) return fail(404, { error: 'Article introuvable.' });
		try {
			await savePost(user, post.id, { status: 'published' });
			return { message: `« ${post.title} » est en ligne.` };
		} catch (err) {
			if (err instanceof PostError) return fail(err.status, { error: err.message });
			throw err;
		}
	},

	unpublish: async ({ request, locals }) => {
		const { post } = await editablePost(request, locals);
		if (!post) return fail(404, { error: 'Article introuvable.' });
		setPostStatus(post.id, 'draft');
		return { message: `« ${post.title} » est repassé en brouillon.` };
	}
};
