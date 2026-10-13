import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { validateSession, destroySession, hasAnyUser } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get('session_id');

	if (sessionId) {
		const { user, session } = validateSession(sessionId);
		if (user && session) {
			event.locals.user = user;
			event.locals.session = session;
		} else {
			event.cookies.delete('session_id', { path: '/' });
			event.locals.user = null;
			event.locals.session = null;
		}
	} else {
		event.locals.user = null;
		event.locals.session = null;
	}

	const path = event.url.pathname;

	// First-run wizard check: if database has zero users, guide user to /register
	const usersExist = hasAnyUser();
	if (!usersExist && !path.startsWith('/register') && !path.startsWith('/api') && !path.startsWith('/uploads')) {
		throw redirect(303, '/register?setup=1');
	}

	// Protect /admin routes
	if (path.startsWith('/admin')) {
		if (!event.locals.user) {
			throw redirect(303, `/login?redirect=${encodeURIComponent(path)}`);
		}
		if (event.locals.user.role !== 'admin' && event.locals.user.role !== 'author') {
			throw redirect(303, '/');
		}
	}

	const response = await resolve(event);
	return response;
};
