import { parseTags, PostError, type PostInput } from './posts';

const MAX_CONTENT_LENGTH = 2_000_000;

/** Validates an untrusted JSON payload into a partial article update. */
export function parsePostInput(body: unknown): PostInput {
	if (!body || typeof body !== 'object') throw new PostError('Requête invalide.');
	const data = body as Record<string, unknown>;
	const input: PostInput = {};

	const str = (key: string, max: number) => {
		const value = data[key];
		if (value === undefined || value === null) return undefined;
		if (typeof value !== 'string') throw new PostError(`Champ « ${key} » invalide.`);
		if (value.length > max) throw new PostError(`Le champ « ${key} » est trop long.`);
		return value;
	};

	input.title = str('title', 200);
	input.slug = str('slug', 120);
	input.excerpt = str('excerpt', 500);
	input.content = str('content', MAX_CONTENT_LENGTH);

	if (data.status !== undefined) {
		if (data.status !== 'draft' && data.status !== 'published' && data.status !== 'archived') {
			throw new PostError('Statut invalide.');
		}
		input.status = data.status;
	}

	if (data.tags !== undefined) {
		if (!Array.isArray(data.tags) && typeof data.tags !== 'string') throw new PostError('Tags invalides.');
		input.tags = parseTags(data.tags as string | string[]);
	}

	for (const key of Object.keys(input) as (keyof PostInput)[]) {
		if (input[key] === undefined) delete input[key];
	}
	return input;
}
