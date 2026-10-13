import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { getMediaFilePath, MEDIA_TYPES } from '$lib/server/media';

const INLINE_TYPES = /^(image\/|application\/pdf|text\/plain)/;

export const GET: RequestHandler = async ({ params, request }) => {
	const filePath = getMediaFilePath(params.filename);
	if (!filePath) error(404, 'Fichier introuvable');

	const stat = fs.statSync(filePath);
	const etag = `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
	const contentType = MEDIA_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';

	const headers: Record<string, string> = {
		'Content-Type': contentType,
		// File names are unique and never overwritten
		'Cache-Control': 'public, max-age=31536000, immutable',
		ETag: etag,
		// User uploads must never run scripts in our origin (SVG, PDF…)
		'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
		'X-Content-Type-Options': 'nosniff'
	};
	if (!INLINE_TYPES.test(contentType)) {
		headers['Content-Disposition'] = `attachment; filename="${path.basename(filePath)}"`;
	}

	if (request.headers.get('if-none-match') === etag) {
		return new Response(null, { status: 304, headers });
	}

	headers['Content-Length'] = stat.size.toString();
	return new Response(Readable.toWeb(fs.createReadStream(filePath)) as ReadableStream, { headers });
};
