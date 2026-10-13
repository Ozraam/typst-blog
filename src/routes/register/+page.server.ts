import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { hasAnyUser, createUser, getUserByUsernameOrEmail, createSession } from '$lib/server/auth';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(303, '/admin');
	}

	const isFirstRun = !hasAnyUser();
	const settingRow = db
		.prepare("SELECT value FROM settings WHERE key = 'allow_registration'")
		.get() as { value: string } | undefined;
	const allowRegistration = settingRow?.value === 'true';

	return {
		isFirstRun,
		allowRegistration
	};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const isFirstRun = !hasAnyUser();
		const settingRow = db
			.prepare("SELECT value FROM settings WHERE key = 'allow_registration'")
			.get() as { value: string } | undefined;
		const allowRegistration = settingRow?.value === 'true';

		if (!isFirstRun && !allowRegistration) {
			return fail(403, {
				error: 'Les inscriptions publiques sont actuellement désactivées par l’administrateur.'
			});
		}

		const data = await request.formData();
		const username = data.get('username')?.toString() || '';
		const email = data.get('email')?.toString() || '';
		const password = data.get('password')?.toString() || '';
		const confirmPassword = data.get('confirmPassword')?.toString() || '';

		if (!username.trim() || !email.trim() || !password) {
			return fail(400, {
				error: 'Tous les champs sont obligatoires.',
				username,
				email
			});
		}

		if (username.length < 3) {
			return fail(400, {
				error: 'Le nom d’utilisateur doit comporter au moins 3 caractères.',
				username,
				email
			});
		}

		if (password.length < 8) {
			return fail(400, {
				error: 'Le mot de passe doit comporter au moins 8 caractères.',
				username,
				email
			});
		}

		if (password !== confirmPassword) {
			return fail(400, {
				error: 'Les mots de passe ne correspondent pas.',
				username,
				email
			});
		}

		// Check if user already exists
		const existing = getUserByUsernameOrEmail(username) || getUserByUsernameOrEmail(email);
		if (existing) {
			return fail(400, {
				error: 'Ce nom d’utilisateur ou cette adresse email est déjà utilisé.',
				username,
				email
			});
		}

		// First user becomes 'admin', subsequent users become 'author'
		const role = isFirstRun ? 'admin' : 'author';
		const newUser = createUser({
			username,
			email,
			password,
			role
		});

		// Create session and log in immediately
		const { sessionId, expiresAt } = createSession(newUser.id);
		cookies.set('session_id', sessionId, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			expires: new Date(expiresAt)
		});

		throw redirect(303, '/admin');
	}
};
