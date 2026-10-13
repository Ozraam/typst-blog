import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { $typst, loadFonts } from '@myriaddreamin/typst.ts';
import { FONTS_DIR } from './db';
import { getMediaFilePath } from './media';
import { renderWeb, type WebRender } from '$lib/typst/engine';

/**
 * Bump whenever the rendering pipeline changes (prelude, SVG post-processing…):
 * stored renders with an older version are regenerated.
 */
export const RENDER_VERSION = 1;

const require = createRequire(import.meta.url);

/**
 * Font fetcher with an on-disk cache in DATA_DIR/fonts: fonts are downloaded once from the
 * typst-assets CDN, then served locally (survives restarts, works offline afterwards).
 */
let downloads: Promise<unknown> = Promise.resolve();

async function cachedFontFetch(input: RequestInfo | URL): Promise<Response> {
	const url = input.toString();
	const file = path.join(FONTS_DIR, path.basename(new URL(url).pathname));
	if (fs.existsSync(file)) {
		return new Response(fs.readFileSync(file));
	}

	// typst.ts requests every font at once: download them one by one, with retries
	const download = downloads.then(async () => {
		let lastError: unknown;
		for (let attempt = 0; attempt < 4; attempt++) {
			try {
				const res = await fetch(url);
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const buffer = Buffer.from(await res.arrayBuffer());
				fs.writeFileSync(`${file}.tmp`, buffer);
				fs.renameSync(`${file}.tmp`, file);
				return buffer;
			} catch (err) {
				lastError = err;
				await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
			}
		}
		throw new Error(`Font download failed: ${url} (${lastError})`);
	});
	downloads = download.catch(() => undefined);
	return new Response(await download);
}

let configured = false;
function configure() {
	if (configured) return;
	configured = true;
	$typst.setCompilerInitOptions({
		getModule: () => fs.readFileSync(require.resolve('@myriaddreamin/typst-ts-web-compiler/wasm')),
		beforeBuild: [loadFonts([], { assets: ['text'], fetcher: cachedFontFetch as typeof fetch })]
	});
	$typst.setRendererInitOptions({
		getModule: () => fs.readFileSync(require.resolve('@myriaddreamin/typst-ts-renderer/wasm'))
	});
}

async function loadUpload(uploadPath: string): Promise<Uint8Array | null> {
	const file = getMediaFilePath(path.basename(uploadPath));
	return file ? new Uint8Array(fs.readFileSync(file)) : null;
}

/**
 * Renders an article for the web. Throws only on infrastructure failures (WASM, fonts);
 * Typst errors are reported through `diagnostics`.
 */
export async function renderArticle(content: string): Promise<WebRender> {
	configure();
	return renderWeb($typst, content, loadUpload);
}

/** Initialises the compiler ahead of the first request (downloads fonts if needed). */
export async function warmUpTypst(): Promise<void> {
	await renderArticle('= Warm-up');
}
