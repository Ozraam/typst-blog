import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { getSettings, saveSettings } from '$lib/server/db';
import { requireAdmin } from '$lib/server/guards';

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals);
	return { settings: getSettings() };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		requireAdmin(locals);
		const data = await request.formData();
		const siteTitle = data.get('site_title')?.toString().trim() ?? '';
		const siteDescription = data.get('site_description')?.toString().trim() ?? '';

		if (!siteTitle) return fail(400, { error: 'Le titre du blog est requis.' });
		if (siteTitle.length > 80 || siteDescription.length > 300) {
			return fail(400, { error: 'Le titre (80) ou la description (300 caractères) est trop long.' });
		}

		saveSettings({ siteTitle, siteDescription, allowRegistration: data.get('allow_registration') === 'on' });
		return { success: true };
	}
};
