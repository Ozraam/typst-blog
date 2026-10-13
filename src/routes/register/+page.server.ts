import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import {
	hasAnyUser,
	createUser,
	createSession,
	isUsernameOrEmailTaken,
	setSessionCookie,
	validateCredentials,
	isHttpsRequest
} from '$lib/server/auth';
import { getSettings } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(303, '/admin');
	return {
		isFirstRun: !hasAnyUser(),
		allowRegistration: getSettings().allowRegistration
	};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const isFirstRun = !hasAnyUser();
		if (!isFirstRun && !getSettings().allowRegistration) {
			return fail(403, { error: 'Les inscriptions sont fermées sur ce blog.', username: '', email: '' });
		}

		const data = await request.formData();
		const username = data.get('username')?.toString().trim() ?? '';
		const email = data.get('email')?.toString().trim() ?? '';
		const password = data.get('password')?.toString() ?? '';
		const confirmPassword = data.get('confirmPassword')?.toString() ?? '';

		const invalid = validateCredentials({ username, email, password });
		if (invalid) return fail(400, { error: invalid, username, email });
		if (password !== confirmPassword) {
			return fail(400, { error: 'Les mots de passe ne correspondent pas.', username, email });
		}
		if (isUsernameOrEmailTaken(username, email)) {
			return fail(400, { error: 'Ce nom d’utilisateur ou cette adresse email est déjà utilisé.', username, email });
		}

		// The very first account administers the blog; later sign-ups are authors
		const user = createUser({ username, email, password, role: isFirstRun ? 'admin' : 'author' });
		setSessionCookie(cookies, createSession(user.id), isHttpsRequest(request));
		redirect(303, isFirstRun ? '/admin?welcome=1' : '/admin');
	}
};
