import type { Handle, ServerInit } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import {
	clearSessionCookie,
	hasAnyUser,
	isHttpsRequest,
	purgeExpiredSessions,
	SESSION_COOKIE,
	validateSession
} from '$lib/server/auth';
import { refreshStaleRenders } from '$lib/server/publishing';
import { warmUpTypst } from '$lib/server/typst';

export const init: ServerInit = async () => {
	purgeExpiredSessions();
	setInterval(purgeExpiredSessions, 6 * 60 * 60 * 1000).unref();

	// Prepare the Typst compiler and re-render outdated articles without delaying startup
	void warmUpTypst()
		.then(refreshStaleRenders)
		.catch((err) => console.error('[typst] warm-up failed:', err));
};

const SECURITY_HEADERS: Record<string, string> = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'SAMEORIGIN',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

export const handle: Handle = async ({ event, resolve }) => {
	const https = isHttpsRequest(event.request);

	// FORCE_HTTPS: visitors arriving over plain HTTP through the proxy (Cloudflare…) are sent to HTTPS.
	// Requests without forwarded headers (LAN, health check) are left alone.
	if (env.FORCE_HTTPS === 'true' && event.request.headers.get('x-forwarded-proto')?.startsWith('http') && !https) {
		redirect(308, `https://${event.url.host}${event.url.pathname}${event.url.search}`);
	}

	const sessionId = event.cookies.get(SESSION_COOKIE);
	const { user, session } = sessionId ? validateSession(sessionId) : { user: null, session: null };
	if (sessionId && !session) {
		clearSessionCookie(event.cookies, https);
	}
	event.locals.user = user;
	event.locals.session = session;

	const path = event.url.pathname;

	// First-run wizard: until an account exists, everything leads to the setup screen
	if (!hasAnyUser() && !/^\/(register|api|uploads|typst)(\/|$)/.test(path) && !path.startsWith('/_app')) {
		redirect(303, '/register');
	}

	if (path === '/admin' || path.startsWith('/admin/')) {
		if (!user) {
			redirect(303, `/login?redirect=${encodeURIComponent(path + event.url.search)}`);
		}
		if (user.role !== 'admin' && user.role !== 'author') {
			redirect(303, '/');
		}
	}

	const response = await resolve(event);
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		if (!response.headers.has(name)) response.headers.set(name, value);
	}
	if (https && env.FORCE_HTTPS === 'true') {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000');
	}
	return response;
};
