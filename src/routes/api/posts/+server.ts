import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { requireEditor, apiError } from '$lib/server/guards';
import { savePost } from '$lib/server/publishing';
import { parsePostInput } from '$lib/server/post-input';

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireEditor(locals);
	try {
		const input = parsePostInput(await request.json());
		const { post, diagnostics } = await savePost(user, null, input);
		return json({ post: { id: post.id, slug: post.slug, status: post.status, updated_at: post.updated_at }, diagnostics }, { status: 201 });
	} catch (err) {
		return apiError(err);
	}
};
