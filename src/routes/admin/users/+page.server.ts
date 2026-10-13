import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { countAdmins, deleteUser, getUserById, listUsers, setUserRole, type Role } from '$lib/server/auth';
import { getSettings } from '$lib/server/db';
import { requireAdmin } from '$lib/server/guards';

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals);
	return { users: listUsers(), allowRegistration: getSettings().allowRegistration };
};

export const actions: Actions = {
	role: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const data = await request.formData();
		const id = data.get('id')?.toString() ?? '';
		const role = data.get('role')?.toString() as Role;
		const target = getUserById(id);

		if (!target || (role !== 'admin' && role !== 'author')) return fail(400, { error: 'Requête invalide.' });
		if (target.id === admin.id) return fail(400, { error: 'Vous ne pouvez pas modifier votre propre rôle.' });
		if (target.role === 'admin' && role !== 'admin' && countAdmins() <= 1) {
			return fail(400, { error: 'Le blog doit conserver au moins un administrateur.' });
		}

		setUserRole(target.id, role);
		return { message: `${target.username} est maintenant ${role === 'admin' ? 'administrateur' : 'auteur'}.` };
	},

	delete: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const id = (await request.formData()).get('id')?.toString() ?? '';
		const target = getUserById(id);

		if (!target) return fail(404, { error: 'Utilisateur introuvable.' });
		if (target.id === admin.id) return fail(400, { error: 'Vous ne pouvez pas supprimer votre propre compte.' });

		deleteUser(target.id, admin.id);
		return { message: `Le compte ${target.username} a été supprimé ; ses articles vous ont été transférés.` };
	}
};
