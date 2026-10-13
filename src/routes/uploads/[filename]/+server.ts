import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';
import { getMediaFilePath } from '$lib/server/media';

const MIME_TYPES: Record<string, string> = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.svg': 'image/svg+xml',
	'.pdf': 'application/pdf',
	'.typ': 'text/plain; charset=utf-8',
	'.txt': 'text/plain; charset=utf-8'
};

export const GET: RequestHandler = async ({ params }) => {
	const filename = params.filename;
	const filePath = getMediaFilePath(filename);

	if (!filePath || !fs.existsSync(filePath)) {
		throw error(404, 'Fichier non trouvé');
	}

	const ext = path.extname(filename).toLowerCase();
	const contentType = MIME_TYPES[ext] || 'application/octet-stream';
	const stat = fs.statSync(filePath);
	const stream = fs.createReadStream(filePath);

	return new Response(stream as any, {
		headers: {
			'Content-Type': contentType,
			'Content-Length': stat.size.toString(),
			'Cache-Control': 'public, max-age=86400'
		}
	});
};
