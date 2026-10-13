import { browser } from '$app/environment';
import { $typst } from '@myriaddreamin/typst.ts';

let initialized = false;
let initPromise: Promise<void> | null = null;

// Cache downloaded media assets in memory to avoid redundant network requests during typing
const assetCache = new Map<string, Uint8Array>();

// 1x1 transparent PNG fallback if an image is not found or is still being typed
const PLACEHOLDER_PNG = new Uint8Array([
	137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1,
	8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 156, 99, 100, 248,
	207, 80, 15, 0, 3, 134, 1, 102, 90, 89, 107, 178, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66,
	96, 130
]);

export async function ensureTypstInit(): Promise<void> {
	if (!browser) return;
	if (initialized) return;
	if (initPromise) return initPromise;

	initPromise = (async () => {
		try {
			$typst.setCompilerInitOptions({
				getModule: () => '/typst/typst_ts_web_compiler_bg.wasm'
			});
			$typst.setRendererInitOptions({
				getModule: () => '/typst/typst_ts_renderer_bg.wasm'
			});
			initialized = true;
		} catch (e) {
			console.error('Failed to configure Typst WASM:', e);
			throw e;
		}
	})();

	return initPromise;
}

/**
 * Extracts referenced image and data file paths from Typst source code.
 */
function extractAssetPaths(source: string): string[] {
	const paths = new Set<string>();

	// Matches function calls like #image("..."), image("..."), #read("..."), etc.
	const funcRegex = /(?:image|read|csv|json|yaml|xml)\s*\(\s*["']([^"']+)["']/g;
	let match: RegExpExecArray | null;
	while ((match = funcRegex.exec(source)) !== null) {
		if (match[1]?.trim()) {
			paths.add(match[1].trim());
		}
	}

	// Matches any direct references to uploaded assets
	const uploadRegex = /["']((\/uploads\/[^"']+)|(uploads\/[^"']+))["']/g;
	while ((match = uploadRegex.exec(source)) !== null) {
		const found = match[2] || match[3];
		if (found?.trim()) {
			paths.add(found.trim());
		}
	}

	return Array.from(paths);
}

/**
 * Pre-fetches and maps referenced assets into the Typst WebAssembly virtual file system.
 */
async function prepareAssets(source: string): Promise<void> {
	if (!browser) return;

	const paths = extractAssetPaths(source);
	if (paths.length === 0) return;

	await Promise.all(
		paths.map(async (rawPath) => {
			const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
			const relativePath = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;

			// Check in-memory cache first
			if (assetCache.has(normalizedPath)) {
				const buffer = assetCache.get(normalizedPath)!;
				await $typst.mapShadow(normalizedPath, buffer);
				await $typst.mapShadow(relativePath, buffer);
				return;
			}

			try {
				const fetchUrl = rawPath.startsWith('http://') || rawPath.startsWith('https://')
					? rawPath
					: normalizedPath;

				const res = await fetch(fetchUrl);
				if (res.ok) {
					const buffer = new Uint8Array(await res.arrayBuffer());
					assetCache.set(normalizedPath, buffer);
					await $typst.mapShadow(normalizedPath, buffer);
					await $typst.mapShadow(relativePath, buffer);
				} else {
					// Fallback to placeholder to prevent Typst compiler from crashing with access denied
					await $typst.mapShadow(normalizedPath, PLACEHOLDER_PNG);
					await $typst.mapShadow(relativePath, PLACEHOLDER_PNG);
				}
			} catch (e) {
				// Network or fetch failure: map placeholder so compiler doesn't crash
				await $typst.mapShadow(normalizedPath, PLACEHOLDER_PNG);
				await $typst.mapShadow(relativePath, PLACEHOLDER_PNG);
			}
		})
	);
}

export interface CompileResult {
	svg: string;
	error: string | null;
}

/**
 * Compiles Typst source code to SVG vector string.
 */
export async function compileToSvg(source: string): Promise<CompileResult> {
	if (!browser) {
		return { svg: '', error: 'Typst WASM compilation runs on the client.' };
	}

	try {
		await ensureTypstInit();

		const content = source.trim() ? source : '// Document vide\n#v(1cm)\n_Commencez à écrire votre article Typst ici..._';

		// Preload and map all referenced images / media into the Typst VFS
		await prepareAssets(content);

		// Mount source code and compile with root: '/'
		await $typst.addSource('/main.typ', content);
		const svg = await $typst.svg({
			mainFilePath: '/main.typ',
			root: '/'
		});

		return { svg, error: null };
	} catch (err: any) {
		console.warn('Typst compile error:', err);
		return {
			svg: '',
			error: err?.message || String(err)
		};
	}
}

/**
 * Compiles Typst source code to PDF bytes.
 */
export async function compileToPdf(source: string): Promise<Blob> {
	if (!browser) {
		throw new Error('PDF compilation runs in the browser.');
	}

	await ensureTypstInit();

	// Preload and map all referenced assets for PDF compilation
	await prepareAssets(source);

	await $typst.addSource('/main.typ', source);
	const pdfData = await $typst.pdf({
		mainFilePath: '/main.typ',
		root: '/'
	});

	return new Blob([pdfData as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
}

/**
 * Downloads a generated PDF file directly in the browser.
 */
export async function downloadPdf(source: string, filename: string): Promise<void> {
	const blob = await compileToPdf(source);
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	setTimeout(() => URL.revokeObjectURL(url), 10000);
}
