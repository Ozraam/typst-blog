import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { requireEditor, apiError } from '$lib/server/guards';
import { savePost } from '$lib/server/publishing';
import { parsePostInput } from '$lib/server/post-input';
import { canEditPost, deletePostPermanent, getPostById, setPostStatus } from '$lib/server/posts';

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	const user = requireEditor(locals);
	try {
		const input = parsePostInput(await request.json());
		const { post, diagnostics } = await savePost(user, params.id, input);
		return json({
			post: { id: post.id, slug: post.slug, status: post.status, updated_at: post.updated_at, published_at: post.published_at },
			diagnostics
		});
	} catch (err) {
		return apiError(err);
	}
};

/** Moves the article to the trash, or purges it (`?permanent=1`, admins only, trashed articles only). */
export const DELETE: RequestHandler = async ({ params, locals, url }) => {
	const user = requireEditor(locals);
	const post = getPostById(params.id);
	if (!post || !canEditPost(user, post)) {
		return json({ error: 'Article introuvable.' }, { status: 404 });
	}

	if (url.searchParams.get('permanent') === '1') {
		if (user.role !== 'admin') {
			return json({ error: 'Seul un administrateur peut supprimer définitivement un article.' }, { status: 403 });
		}
		if (post.status !== 'trash') {
			return json({ error: 'Placez d’abord l’article dans la corbeille.' }, { status: 409 });
		}
		deletePostPermanent(post.id);
		return json({ deleted: true });
	}

	setPostStatus(post.id, 'trash');
	return json({ trashed: true });
};
