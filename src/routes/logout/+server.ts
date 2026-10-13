import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { destroySession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies }) => {
	const sessionId = cookies.get('session_id');
	if (sessionId) {
		destroySession(sessionId);
		cookies.delete('session_id', { path: '/' });
	}
	throw redirect(303, '/');
};

export const GET: RequestHandler = async ({ cookies }) => {
	const sessionId = cookies.get('session_id');
	if (sessionId) {
		destroySession(sessionId);
		cookies.delete('session_id', { path: '/' });
	}
	throw redirect(303, '/');
};
