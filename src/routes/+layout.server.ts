import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: LayoutServerLoad = async ({ locals }) => {
	const siteTitleRow = db.prepare("SELECT value FROM settings WHERE key = 'site_title'").get() as
		| { value: string }
		| undefined;
	const siteDescRow = db
		.prepare("SELECT value FROM settings WHERE key = 'site_description'")
		.get() as { value: string } | undefined;

	return {
		user: locals.user,
		siteTitle: siteTitleRow?.value || 'Typst Blog',
		siteDescription: siteDescRow?.value || 'Moteur de blog moderne propulsé par Typst et SvelteKit'
	};
};
