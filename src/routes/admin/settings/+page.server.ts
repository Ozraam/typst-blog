import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { getUserById, verifyPassword, hashPassword } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		throw error(403, 'Accès réservé aux administrateurs.');
	}

	const settingsRows = db.prepare('SELECT key, value FROM settings').all() as {
		key: string;
		value: string;
	}[];

	const settings: Record<string, string> = {};
	for (const row of settingsRows) {
		settings[row.key] = row.value;
	}

	const user = getUserById(locals.user.id);

	return {
		settings,
		profile: {
			username: user?.username || '',
			email: user?.email || ''
		}
	};
};

export const actions: Actions = {
	saveSettings: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403);

		const data = await request.formData();
		const siteTitle = data.get('site_title')?.toString() || 'Typst Blog';
		const siteDescription = data.get('site_description')?.toString() || '';
		const allowRegistration = data.get('allow_registration') === 'on' ? 'true' : 'false';

		const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
		stmt.run('site_title', siteTitle.trim());
		stmt.run('site_description', siteDescription.trim());
		stmt.run('allow_registration', allowRegistration);

		return { successSettings: true };
	},

	updateProfile: async ({ request, locals }) => {
		if (!locals.user) return fail(401);

		const data = await request.formData();
		const username = data.get('username')?.toString() || '';
		const email = data.get('email')?.toString() || '';
		const currentPassword = data.get('current_password')?.toString() || '';
		const newPassword = data.get('new_password')?.toString() || '';

		if (!username.trim() || !email.trim()) {
			return fail(400, { errorProfile: 'Le nom d’utilisateur et l’email sont requis.' });
		}

		const user = getUserById(locals.user.id);
		if (!user) return fail(404);

		// If changing password, verify current password
		if (newPassword) {
			if (!currentPassword) {
				return fail(400, { errorProfile: 'Veuillez saisir votre mot de passe actuel pour le modifier.' });
			}
			if (!verifyPassword(currentPassword, user.password_hash)) {
				return fail(400, { errorProfile: 'Mot de passe actuel incorrect.' });
			}
			if (newPassword.length < 8) {
				return fail(400, { errorProfile: 'Le nouveau mot de passe doit faire au moins 8 caractères.' });
			}

			const newHash = hashPassword(newPassword);
			db.prepare('UPDATE users SET username = ?, email = ?, password_hash = ?, updated_at = ? WHERE id = ?').run(
				username.trim(),
				email.trim().toLowerCase(),
				newHash,
				Date.now(),
				locals.user.id
			);
		} else {
			db.prepare('UPDATE users SET username = ?, email = ?, updated_at = ? WHERE id = ?').run(
				username.trim(),
				email.trim().toLowerCase(),
				Date.now(),
				locals.user.id
			);
		}

		return { successProfile: true };
	}
};
