import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Points DATA_DIR to a fresh temporary directory. Must run before any `$lib/server` import.
 * Typst fonts are shared between runs so they are only downloaded once.
 */
export function useTemporaryDataDir(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'typst-blog-test-'));
	const fontCache = path.resolve('node_modules/.cache/typst-blog-fonts');
	fs.mkdirSync(fontCache, { recursive: true });
	fs.symlinkSync(fontCache, path.join(dir, 'fonts'));
	process.env.DATA_DIR = dir;
	return dir;
}
