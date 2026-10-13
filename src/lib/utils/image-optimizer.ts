/**
 * Client-side image optimization utility.
 * Automatically resizes and compresses high-resolution images (JPEG, PNG, WebP)
 * using HTML5 Canvas before uploading to server.
 */

export interface OptimizeOptions {
	maxDimension?: number; // Maximum width or height in pixels (default 2048)
	quality?: number; // Compression quality from 0.1 to 1.0 (default 0.82)
	maxFileSizeToSkip?: number; // Skip optimization if file is already smaller than this in bytes (default 300KB)
}

export interface OptimizationResult {
	file: File;
	originalSize: number;
	optimizedSize: number;
	wasOptimized: boolean;
	savedBytes: number;
	savedPercent: number;
}

/**
 * Optimizes an image file in the browser before sending it over the network.
 * Preserves SVGs and GIFs (to keep vector quality and animations).
 */
export async function optimizeImageFile(
	file: File,
	options: OptimizeOptions = {}
): Promise<OptimizationResult> {
	const {
		maxDimension = 2048,
		quality = 0.82,
		maxFileSizeToSkip = 300 * 1024
	} = options;

	const defaultResult: OptimizationResult = {
		file,
		originalSize: file.size,
		optimizedSize: file.size,
		wasOptimized: false,
		savedBytes: 0,
		savedPercent: 0
	};

	// Only process in browser environment
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		return defaultResult;
	}

	// Only process raster images
	const isRasterImage =
		file.type.startsWith('image/') &&
		file.type !== 'image/svg+xml' &&
		file.type !== 'image/gif';

	if (!isRasterImage) {
		return defaultResult;
	}

	try {
		// Load image via createImageBitmap or Image element
		let imgWidth = 0;
		let imgHeight = 0;
		let source: ImageBitmap | HTMLImageElement;

		if (typeof createImageBitmap === 'function') {
			try {
				const bitmap = await createImageBitmap(file);
				imgWidth = bitmap.width;
				imgHeight = bitmap.height;
				source = bitmap;
			} catch {
				// Fallback to Image element if createImageBitmap fails
				const img = await loadImageElement(file);
				imgWidth = img.naturalWidth;
				imgHeight = img.naturalHeight;
				source = img;
			}
		} else {
			const img = await loadImageElement(file);
			imgWidth = img.naturalWidth;
			imgHeight = img.naturalHeight;
			source = img;
		}

		// Check if image is already small enough in dimensions and byte size
		if (
			file.size <= maxFileSizeToSkip &&
			imgWidth <= maxDimension &&
			imgHeight <= maxDimension
		) {
			if ('close' in source && typeof source.close === 'function') {
				source.close();
			}
			return defaultResult;
		}

		// Calculate proportional resized dimensions
		let targetWidth = imgWidth;
		let targetHeight = imgHeight;

		if (targetWidth > maxDimension || targetHeight > maxDimension) {
			if (targetWidth > targetHeight) {
				targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
				targetWidth = maxDimension;
			} else {
				targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
				targetHeight = maxDimension;
			}
		}

		// Render to high-quality Canvas
		const canvas = document.createElement('canvas');
		canvas.width = targetWidth;
		canvas.height = targetHeight;

		const ctx = canvas.getContext('2d');
		if (!ctx) {
			if ('close' in source && typeof source.close === 'function') {
				source.close();
			}
			return defaultResult;
		}

		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'high';
		ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

		if ('close' in source && typeof source.close === 'function') {
			source.close();
		}

		// Determine target format: WebP offers best compression and is supported by Typst and modern browsers.
		// If original was PNG with potential transparency, WebP preserves alpha.
		const targetFormat = 'image/webp';
		let blob = await canvasToBlob(canvas, targetFormat, quality);

		// Fallback to JPEG if WebP encoding failed
		if (!blob) {
			blob = await canvasToBlob(canvas, 'image/jpeg', quality);
		}

		if (!blob) {
			return defaultResult;
		}

		// If the compressed blob isn't smaller than the original and dimensions didn't shrink, keep original
		if (blob.size >= file.size && targetWidth === imgWidth && targetHeight === imgHeight) {
			return defaultResult;
		}

		// Generate a clean filename with updated extension
		const originalNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
		const newExt = blob.type === 'image/webp' ? '.webp' : '.jpg';
		const newFileName = `${originalNameWithoutExt}${newExt}`;

		const optimizedFile = new File([blob], newFileName, {
			type: blob.type,
			lastModified: Date.now()
		});

		const savedBytes = file.size - optimizedFile.size;
		const savedPercent = Math.max(0, Math.round((savedBytes / file.size) * 100));

		return {
			file: optimizedFile,
			originalSize: file.size,
			optimizedSize: optimizedFile.size,
			wasOptimized: true,
			savedBytes,
			savedPercent
		};
	} catch (err) {
		console.warn('Image optimization skipped due to error:', err);
		return defaultResult;
	}
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve(img);
		};
		img.onerror = (e) => {
			URL.revokeObjectURL(url);
			reject(e);
		};
		img.src = url;
	});
}

function canvasToBlob(
	canvas: HTMLCanvasElement,
	type: string,
	quality: number
): Promise<Blob | null> {
	return new Promise((resolve) => {
		canvas.toBlob((blob) => resolve(blob), type, quality);
	});
}
