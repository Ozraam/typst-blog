import { error, json } from '@sveltejs/kit';
import { PostError } from './posts';
import { MediaError } from './media';

type Locals = App.Locals;

/** Returns the signed-in admin/author, or throws a 401/403. */
export function requireEditor(locals: Locals) {
	if (!locals.user) error(401, 'Authentification requise.');
	if (locals.user.role !== 'admin' && locals.user.role !== 'author') error(403, 'Accès refusé.');
	return locals.user;
}

export function requireAdmin(locals: Locals) {
	const user = requireEditor(locals);
	if (user.role !== 'admin') error(403, 'Action réservée aux administrateurs.');
	return user;
}

/** Converts domain errors into JSON API responses. */
export function apiError(err: unknown) {
	if (err instanceof PostError) {
		return json({ error: err.message, diagnostics: err.diagnostics }, { status: err.status });
	}
	if (err instanceof MediaError) {
		return json({ error: err.message }, { status: 400 });
	}
	throw err;
}
