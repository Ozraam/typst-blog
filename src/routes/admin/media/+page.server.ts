import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { listMedia, saveUploadedFile, deleteMedia } from '$lib/server/media';

export const load: PageServerLoad = async () => {
	const media = listMedia();
	return {
		media
	};
};

export const actions: Actions = {
	upload: async ({ request, locals }) => {
		if (!locals.user) return fail(401);

		const formData = await request.formData();
		const file = formData.get('file');

		if (!file || !(file instanceof File) || file.size === 0) {
			return fail(400, { error: 'Veuillez sélectionner un fichier valide.' });
		}

		try {
			await saveUploadedFile(file, locals.user.id);
			return { success: true };
		} catch (e: any) {
			return fail(500, { error: e.message || 'Erreur lors du téléversement.' });
		}
	},

	delete: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Action réservée aux administrateurs.' });
		}

		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400);

		deleteMedia(id);
		return { success: true };
	}
};
