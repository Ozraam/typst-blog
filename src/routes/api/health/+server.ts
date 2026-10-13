import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async () => {
	try {
		// Verify db connectivity
		db.prepare('SELECT 1').get();
		return json({
			status: 'ok',
			uptime: process.uptime(),
			timestamp: Date.now()
		});
	} catch (e: any) {
		return json(
			{
				status: 'error',
				error: e.message
			},
			{ status: 500 }
		);
	}
};
