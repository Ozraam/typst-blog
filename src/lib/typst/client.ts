/**
 * Browser-side Typst: live preview in the editor and PDF export for readers.
 * Loaded lazily (dynamic import) so that pages only pay for the WASM when they need it.
 */
import { $typst } from '@myriaddreamin/typst.ts';
import compilerWasm from '@myriaddreamin/typst-ts-web-compiler/wasm?url';
import rendererWasm from '@myriaddreamin/typst-ts-renderer/wasm?url';
import { renderPdf, renderWeb, type AssetLoader, type PdfRender, type WebRender } from './engine';

let configured = false;
function configure() {
	if (configured) return;
	configured = true;
	$typst.setCompilerInitOptions({ getModule: () => compilerWasm });
	$typst.setRendererInitOptions({ getModule: () => rendererWasm });
}

const assetCache = new Map<string, Uint8Array | null>();

const loadAsset: AssetLoader = async (path) => {
	if (assetCache.has(path)) return assetCache.get(path)!;
	try {
		const res = await fetch(path);
		const data = res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
		// Missing files are not cached: the author may be uploading them right now
		if (data) assetCache.set(path, data);
		return data;
	} catch {
		return null;
	}
};

export function compileForWeb(content: string): Promise<WebRender> {
	configure();
	return renderWeb($typst, content, loadAsset);
}

export function compilePdf(content: string, title?: string): Promise<PdfRender> {
	configure();
	return renderPdf($typst, content, loadAsset, title);
}

export function downloadBlob(data: BlobPart, filename: string, type: string) {
	const url = URL.createObjectURL(new Blob([data], { type }));
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
