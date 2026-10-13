import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getUserByUsernameOrEmail, verifyPassword, createSession, hasAnyUser } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals, url }) => {
	// First-run wizard: if no user exists, guide to register
	if (!hasAnyUser()) {
		throw redirect(303, '/register?setup=1');
	}

	if (locals.user) {
		const target = url.searchParams.get('redirect') || '/admin';
		throw redirect(303, target);
	}

	return {
		redirect: url.searchParams.get('redirect') || '/admin'
	};
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const identifier = data.get('identifier')?.toString() || '';
		const password = data.get('password')?.toString() || '';
		const target = url.searchParams.get('redirect') || '/admin';

		if (!identifier || !password) {
			return fail(400, {
				error: 'Veuillez saisir votre nom d’utilisateur (ou email) et votre mot de passe.',
				identifier
			});
		}

		const user = getUserByUsernameOrEmail(identifier);
		if (!user) {
			return fail(400, {
				error: 'Identifiants incorrects.',
				identifier
			});
		}

		const isValid = verifyPassword(password, user.password_hash);
		if (!isValid) {
			return fail(400, {
				error: 'Identifiants incorrects.',
				identifier
			});
		}

		// Create session
		const { sessionId, expiresAt } = createSession(user.id);
		cookies.set('session_id', sessionId, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			expires: new Date(expiresAt)
		});

		throw redirect(303, target);
	}
};
