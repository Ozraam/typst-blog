import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import {
	destroyAllUserSessions,
	getUserById,
	isUsernameOrEmailTaken,
	updateUserProfile,
	validateCredentials,
	verifyPassword
} from '$lib/server/auth';
import { requireEditor } from '$lib/server/guards';

export const load: PageServerLoad = async ({ locals }) => {
	const user = getUserById(requireEditor(locals).id)!;
	return { profile: { username: user.username, email: user.email, role: user.role, created_at: user.created_at } };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const sessionUser = requireEditor(locals);
		const user = getUserById(sessionUser.id);
		if (!user) return fail(404);

		const data = await request.formData();
		const username = data.get('username')?.toString().trim() ?? '';
		const email = data.get('email')?.toString().trim() ?? '';
		const currentPassword = data.get('current_password')?.toString() ?? '';
		const newPassword = data.get('new_password')?.toString() ?? '';

		const invalid = validateCredentials({ username, email, password: newPassword || undefined });
		if (invalid) return fail(400, { error: invalid });
		if (isUsernameOrEmailTaken(username, email, user.id)) {
			return fail(400, { error: 'Ce nom d’utilisateur ou cette adresse email est déjà utilisé.' });
		}

		if (newPassword) {
			if (!verifyPassword(currentPassword, user.password_hash)) {
				return fail(400, { error: 'Le mot de passe actuel est incorrect.' });
			}
			// Changing the password signs out every other device
			destroyAllUserSessions(user.id, locals.session?.id);
		}

		updateUserProfile(user.id, { username, email, password: newPassword || undefined });
		return { success: newPassword ? 'Profil et mot de passe mis à jour.' : 'Profil mis à jour.' };
	}
};
