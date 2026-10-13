import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { listMedia, saveUploadedFile, deleteMedia } from '$lib/server/media';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Non autorisé');
	}
	const media = listMedia();
	return json({ media });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'author')) {
		throw error(401, 'Non autorisé');
	}

	try {
		const formData = await request.formData();
		const file = formData.get('file');

		if (!file || !(file instanceof File)) {
			return json({ error: 'Fichier requis' }, { status: 400 });
		}

		// Enforce a maximum file size (25MB)
		const MAX_SIZE = 25 * 1024 * 1024;
		if (file.size > MAX_SIZE) {
			return json({ error: 'Le fichier dépasse la taille maximale autorisée (25 Mo)' }, { status: 400 });
		}

		const mediaItem = await saveUploadedFile(file, locals.user.id);
		return json({ success: true, media: mediaItem });
	} catch (e: any) {
		console.error('Upload error:', e);
		return json({ error: e.message || "Erreur lors du téléversement de l'image" }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		throw error(403, 'Action réservée aux administrateurs');
	}

	try {
		const { id } = await request.json();
		if (!id) return json({ error: 'ID requis' }, { status: 400 });

		const success = deleteMedia(id);
		return json({ success });
	} catch (e: any) {
		return json({ error: e.message }, { status: 500 });
	}
};
