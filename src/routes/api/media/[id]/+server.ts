import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { requireEditor } from '$lib/server/guards';
import { deleteMedia, getMedia } from '$lib/server/media';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = requireEditor(locals);
	const item = getMedia(params.id);
	if (!item) return json({ error: 'Fichier introuvable.' }, { status: 404 });
	if (user.role !== 'admin' && item.uploader_id !== user.id) {
		return json({ error: 'Vous ne pouvez supprimer que vos propres fichiers.' }, { status: 403 });
	}
	deleteMedia(item.id);
	return json({ deleted: true });
};
