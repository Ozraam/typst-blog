import { optimizeImageFile } from '$lib/utils/image-optimizer';
import { formatBytes } from '$lib/format';

export interface UploadedMedia {
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

export const ACCEPTED_UPLOADS = '.png,.jpg,.jpeg,.gif,.webp,.svg,.pdf,.csv,.json,.yaml,.yml,.txt,.bib,.typ';

/**
 * Uploads files one by one (large raster images are resized/compressed in the browser first).
 * `onProgress` receives a human-readable status.
 */
export async function uploadFiles(
	files: Iterable<File>,
	onProgress: (status: string) => void
): Promise<{ uploaded: UploadedMedia[]; errors: string[] }> {
	const uploaded: UploadedMedia[] = [];
	const errors: string[] = [];

	for (const original of files) {
		let file = original;
		if (/^image\/(png|jpeg|webp)$/.test(file.type)) {
			onProgress(`Optimisation de ${file.name}…`);
			const result = await optimizeImageFile(file, { maxDimension: 2400, quality: 0.85 });
			if (result.wasOptimized) {
				onProgress(`${file.name} : ${formatBytes(result.originalSize)} → ${formatBytes(result.optimizedSize)}`);
			}
			file = result.file;
		}

		onProgress(`Envoi de ${file.name}…`);
		const body = new FormData();
		body.append('file', file);
		try {
			const res = await fetch('/api/media', { method: 'POST', body });
			const data = await res.json().catch(() => ({}));
			if (res.ok) uploaded.push(data.media);
			else errors.push(`${original.name} : ${data.error ?? data.message ?? 'échec de l’envoi'}`);
		} catch {
			errors.push(`${original.name} : erreur réseau`);
		}
	}

	return { uploaded, errors };
}

/** Typst snippet inserting a media file in an article. */
export function typstSnippetFor(item: Pick<UploadedMedia, 'url' | 'mime_type' | 'original_name'>): string {
	if (item.mime_type.startsWith('image/')) {
		return `#figure(\n  image("${item.url}", width: 80%),\n  caption: [Légende],\n)`;
	}
	if (/\.(csv)$/i.test(item.url)) return `#let data = csv("${item.url}")`;
	if (/\.(json)$/i.test(item.url)) return `#let data = json("${item.url}")`;
	if (/\.(ya?ml)$/i.test(item.url)) return `#let data = yaml("${item.url}")`;
	if (/\.(bib)$/i.test(item.url)) return `#bibliography("${item.url}")`;
	if (/\.(typ)$/i.test(item.url)) return `#import "${item.url}": *`;
	return `#link("${item.url}")[${item.original_name.replace(/[\[\]]/g, '')}]`;
}
