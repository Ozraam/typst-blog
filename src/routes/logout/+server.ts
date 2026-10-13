import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { clearSessionCookie, destroySession, isHttpsRequest, SESSION_COOKIE } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies, request }) => {
	const sessionId = cookies.get(SESSION_COOKIE);
	if (sessionId) {
		destroySession(sessionId);
		clearSessionCookie(cookies, isHttpsRequest(request));
	}
	redirect(303, '/');
};
