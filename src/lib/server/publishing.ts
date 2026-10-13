import {
	canEditPost,
	createPost,
	getPostById,
	listStaleRenders,
	PostError,
	saveRender,
	updatePost,
	type Post,
	type PostInput,
	type RenderFields,
	type SessionUser
} from './posts';
import { renderArticle, RENDER_VERSION } from './typst';
import type { Diagnostic } from '$lib/typst/engine';

type RenderOutcome =
	| { ok: true; fields: RenderFields; diagnostics: Diagnostic[] }
	| { ok: false; reason: 'typst'; diagnostics: Diagnostic[] }
	| { ok: false; reason: 'unavailable'; diagnostics: Diagnostic[] };

async function render(content: string): Promise<RenderOutcome> {
	try {
		const result = await renderArticle(content);
		if (!result.svg) return { ok: false, reason: 'typst', diagnostics: result.diagnostics };
		return {
			ok: true,
			diagnostics: result.diagnostics,
			fields: {
				rendered_svg: result.svg,
				toc_json: JSON.stringify(result.toc),
				plain_text: result.plainText,
				word_count: result.wordCount,
				render_version: RENDER_VERSION
			}
		};
	} catch (err) {
		// Infrastructure problem (WASM, fonts offline…): the public page falls back to client rendering.
		console.error('[typst] server render failed:', err);
		return { ok: false, reason: 'unavailable', diagnostics: [] };
	}
}

function isPublic(status: string) {
	return status === 'published' || status === 'archived';
}

/**
 * Creates or updates an article. Public articles are rendered on the server: publishing a
 * document that does not compile is refused with the Typst diagnostics.
 */
export async function savePost(
	user: SessionUser,
	id: string | null,
	input: PostInput
): Promise<{ post: Post; diagnostics: Diagnostic[] }> {
	if (user.role !== 'admin' && user.role !== 'author') throw new PostError('Non autorisé.', 403);

	const existing = id ? getPostById(id) : null;
	if (id && !existing) throw new PostError('Article introuvable.', 404);
	if (existing && !canEditPost(user, existing)) throw new PostError('Vous ne pouvez pas modifier cet article.', 403);
	if (existing?.status === 'trash' && !input.status) {
		throw new PostError('Restaurez l’article avant de le modifier.', 409);
	}

	const content = input.content ?? existing?.content ?? '';
	const status = input.status ?? existing?.status ?? 'draft';
	const needsRender =
		isPublic(status) &&
		(!existing ||
			content !== existing.content ||
			!existing.rendered_svg ||
			existing.render_version < RENDER_VERSION);

	let fields: RenderFields | undefined;
	let diagnostics: Diagnostic[] = [];
	if (needsRender) {
		const outcome = await render(content);
		diagnostics = outcome.diagnostics;
		if (outcome.ok) {
			fields = outcome.fields;
		} else if (outcome.reason === 'typst' && status === 'published') {
			throw new PostError('Le document contient des erreurs Typst : corrigez-les avant de publier.', 422, diagnostics);
		}
	}

	const post = existing
		? updatePost(existing.id, input, fields)
		: createPost({ ...input, title: input.title ?? '', author_id: user.id }, fields);
	return { post, diagnostics };
}

/** Renders (and stores) an article whose cached render is missing or outdated. */
export async function ensureRendered(post: Post): Promise<Post> {
	if (post.rendered_svg && post.render_version >= RENDER_VERSION) return post;
	const outcome = await render(post.content);
	if (!outcome.ok) return post;
	saveRender(post.id, outcome.fields);
	return { ...post, ...outcome.fields };
}

/** Re-renders, one at a time, every public article rendered by an older pipeline. */
export async function refreshStaleRenders(): Promise<void> {
	const stale = listStaleRenders(RENDER_VERSION);
	for (const { id, content } of stale) {
		const outcome = await render(content);
		if (outcome.ok) saveRender(id, outcome.fields);
		else if (outcome.reason === 'unavailable') return;
	}
	if (stale.length) console.log(`[typst] ${stale.length} article(s) re-rendered`);
}
