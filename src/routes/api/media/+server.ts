import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { requireEditor, apiError } from '$lib/server/guards';
import { listMedia, saveUploadedFile } from '$lib/server/media';

export const GET: RequestHandler = async ({ locals }) => {
	requireEditor(locals);
	return json({ media: listMedia() });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireEditor(locals);
	try {
		const formData = await request.formData();
		const file = formData.get('file');
		if (!(file instanceof File)) {
			return json({ error: 'Fichier requis.' }, { status: 400 });
		}
		const media = await saveUploadedFile(file, user.id);
		return json({ media: { ...media, usage_count: 0, uploader_name: user.username } }, { status: 201 });
	} catch (err) {
		return apiError(err);
	}
};
