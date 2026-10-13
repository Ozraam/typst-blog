import type { LayoutServerLoad } from './$types';
import { requireEditor } from '$lib/server/guards';

export const load: LayoutServerLoad = async ({ locals }) => {
	return { user: requireEditor(locals) };
};
