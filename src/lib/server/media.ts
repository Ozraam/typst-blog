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
}

export function saveUploadedFile(
	file: File,
	uploaderId: string
): Promise<MediaItem> {
	return new Promise(async (resolve, reject) => {
		try {
			const id = crypto.randomUUID();
			const ext = path.extname(file.name) || '.bin';
			const base = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
			const filename = `${Date.now()}-${base}${ext}`.toLowerCase();
			const filePath = path.join(UPLOADS_DIR, filename);

			const buffer = Buffer.from(await file.arrayBuffer());
			fs.writeFileSync(filePath, buffer);

			const url = `/uploads/${filename}`;
			const now = Date.now();

			db.prepare(
				`INSERT INTO media (id, filename, original_name, mime_type, size, url, created_at, uploader_id)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
			).run(id, filename, file.name, file.type || 'application/octet-stream', file.size, url, now, uploaderId);

			resolve({
				id,
				filename,
				original_name: file.name,
				mime_type: file.type || 'application/octet-stream',
				size: file.size,
				url,
				created_at: now,
				uploader_id: uploaderId
			});
		} catch (err) {
			reject(err);
		}
	});
}

export function listMedia(): MediaItem[] {
	return db.prepare('SELECT * FROM media ORDER BY created_at DESC').all() as MediaItem[];
}

export function deleteMedia(id: string): boolean {
	const item = db.prepare('SELECT * FROM media WHERE id = ?').get(id) as MediaItem | undefined;
	if (!item) return false;

	const filePath = path.join(UPLOADS_DIR, item.filename);
	if (fs.existsSync(filePath)) {
		try {
			fs.unlinkSync(filePath);
		} catch (e) {
			console.error('Failed to remove file from disk:', e);
		}
	}

	const info = db.prepare('DELETE FROM media WHERE id = ?').run(id);
	return info.changes > 0;
}

export function getMediaFilePath(filename: string): string | null {
	// Sanitize to prevent path traversal
	const safeFilename = path.basename(filename);
	const filePath = path.join(UPLOADS_DIR, safeFilename);
	if (fs.existsSync(filePath)) {
		return filePath;
	}
	return null;
}
