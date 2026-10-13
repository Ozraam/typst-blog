import type { PageServerLoad } from './$types';
import { listMedia } from '$lib/server/media';
import { requireEditor } from '$lib/server/guards';

export const load: PageServerLoad = async ({ locals }) => {
	requireEditor(locals);
	return { media: listMedia() };
};
