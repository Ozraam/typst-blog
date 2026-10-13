import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { db, UPLOADS_DIR } from './db';

export interface MediaItem {
	id: string;
	filename: string;
	original_name: string;
	mime_type: string;
	size: number;
	url: string;
	created_at: number;
	uploader_id: string;
	uploader_name?: string;
	usage_count?: number;
}

export const MAX_UPLOAD_SIZE = 25 * 1024 * 1024;

/** Extensions accepted for upload, with the Content-Type used to serve them. */
export const MEDIA_TYPES: Record<string, string> = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.svg': 'image/svg+xml',
	'.pdf': 'application/pdf',
	'.csv': 'text/csv; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.yaml': 'text/yaml; charset=utf-8',
	'.yml': 'text/yaml; charset=utf-8',
	'.txt': 'text/plain; charset=utf-8',
	'.bib': 'text/plain; charset=utf-8',
	'.typ': 'text/plain; charset=utf-8'
};

export class MediaError extends Error {}

export async function saveUploadedFile(file: File, uploaderId: string): Promise<MediaItem> {
	const ext = path.extname(file.name).toLowerCase();
	const mimeType = MEDIA_TYPES[ext];
	if (!mimeType) {
		throw new MediaError(`Type de fichier non pris en charge (${ext || 'sans extension'}).`);
	}
	if (file.size === 0) throw new MediaError('Le fichier est vide.');
	if (file.size > MAX_UPLOAD_SIZE) throw new MediaError('Le fichier dépasse la taille maximale autorisée (25 Mo).');

	const base =
		path
			.basename(file.name, path.extname(file.name))
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^a-zA-Z0-9_-]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.toLowerCase()
			.slice(0, 60) || 'fichier';
	const filename = `${base}-${crypto.randomBytes(4).toString('hex')}${ext}`;

	fs.writeFileSync(path.join(UPLOADS_DIR, filename), Buffer.from(await file.arrayBuffer()));

	const item: MediaItem = {
		id: crypto.randomUUID(),
		filename,
		original_name: file.name,
		mime_type: mimeType.split(';')[0],
		size: file.size,
		url: `/uploads/${filename}`,
		created_at: Date.now(),
		uploader_id: uploaderId
	};

	db.prepare(
		`INSERT INTO media (id, filename, original_name, mime_type, size, url, created_at, uploader_id)
		 VALUES (@id, @filename, @original_name, @mime_type, @size, @url, @created_at, @uploader_id)`
	).run(item);

	return item;
}

export function listMedia(): MediaItem[] {
	const items = db
		.prepare(
			`SELECT m.*, u.username AS uploader_name
			 FROM media m LEFT JOIN users u ON u.id = m.uploader_id
			 ORDER BY m.created_at DESC`
		)
		.all() as MediaItem[];

	// Count articles (outside the trash) referencing each file
	const contents = db.prepare("SELECT content FROM posts WHERE status != 'trash'").all() as { content: string }[];
	for (const item of items) {
		item.usage_count = contents.filter((p) => p.content.includes(item.url)).length;
	}
	return items;
}

export function getMedia(id: string): MediaItem | null {
	return (db.prepare('SELECT * FROM media WHERE id = ?').get(id) as MediaItem | undefined) ?? null;
}

export function deleteMedia(id: string): boolean {
	const item = getMedia(id);
	if (!item) return false;

	const filePath = path.join(UPLOADS_DIR, path.basename(item.filename));
	try {
		fs.rmSync(filePath, { force: true });
	} catch (e) {
		console.error('Failed to remove file from disk:', e);
	}

	return db.prepare('DELETE FROM media WHERE id = ?').run(id).changes > 0;
}

/** Resolves an upload by file name, refusing anything outside the uploads directory. */
export function getMediaFilePath(filename: string): string | null {
	const safeFilename = path.basename(filename);
	if (!safeFilename || safeFilename.startsWith('.')) return null;
	const filePath = path.join(UPLOADS_DIR, safeFilename);
	return fs.existsSync(filePath) && fs.statSync(filePath).isFile() ? filePath : null;
}
