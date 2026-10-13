import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	if (locals.user.role !== 'admin' && locals.user.role !== 'author') {
		throw redirect(303, '/');
	}

	return {
		user: locals.user
	};
};
