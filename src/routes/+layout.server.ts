import type { LayoutServerLoad } from './$types';
import { getSettings } from '$lib/server/db';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { siteTitle, siteDescription } = getSettings();
	return { user: locals.user, siteTitle, siteDescription };
};
