import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import {
	authenticate,
	clearLoginFailures,
	createSession,
	hasAnyUser,
	isLoginThrottled,
	recordLoginFailure,
	safeRedirect,
	setSessionCookie
} from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!hasAnyUser()) redirect(303, '/register');
	const target = safeRedirect(url.searchParams.get('redirect'));
	if (locals.user) redirect(303, target);
	return { redirect: target };
};

export const actions: Actions = {
	default: async ({ request, cookies, url, getClientAddress }) => {
		const data = await request.formData();
		const identifier = data.get('identifier')?.toString().trim() ?? '';
		const password = data.get('password')?.toString() ?? '';
		const target = safeRedirect(url.searchParams.get('redirect'));

		if (!identifier || !password) {
			return fail(400, { error: 'Saisissez votre identifiant et votre mot de passe.', identifier });
		}

		const throttleKey = `${getClientAddress()}|${identifier.toLowerCase()}`;
		if (isLoginThrottled(throttleKey)) {
			return fail(429, { error: 'Trop de tentatives. Réessayez dans quelques minutes.', identifier });
		}

		const user = authenticate(identifier, password);
		if (!user) {
			recordLoginFailure(throttleKey);
			return fail(400, { error: 'Identifiant ou mot de passe incorrect.', identifier });
		}

		clearLoginFailures(throttleKey);
		setSessionCookie(cookies, createSession(user.id), url.protocol === 'https:');
		redirect(303, target);
	}
};
