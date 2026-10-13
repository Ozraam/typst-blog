<script lang="ts">
	import { onMount } from 'svelte';
	import type { MediaItem } from '$lib/server/media';

	import { optimizeImageFile, formatBytes } from '$lib/utils/image-optimizer';

	let { isOpen = $bindable(false), onSelect } = $props<{
		isOpen: boolean;
		onSelect: (snippet: string) => void;
	}>();

	let mediaList = $state<MediaItem[]>([]);
	let isUploading = $state(false);
	let uploadStatus = $state<string | null>(null);
	let uploadError = $state<string | null>(null);
	let dragOver = $state(false);

	async function loadMedia() {
		try {
			const res = await fetch('/api/media');
			if (res.ok) {
				const data = await res.json();
				mediaList = data.media || [];
			}
		} catch (e) {
			console.error('Failed to load media:', e);
		}
	}

	onMount(() => {
		if (isOpen) {
			loadMedia();
		}
	});

	$effect(() => {
		if (isOpen) {
			loadMedia();
		}
	});

	async function handleUpload(files: FileList | null) {
		if (!files || files.length === 0) return;
		isUploading = true;
		uploadError = null;
		uploadStatus = null;

		for (const file of Array.from(files)) {
			let fileToUpload = file;

			// If it's a raster image, optimize and resize client-side
			if (file.type.startsWith('image/') && file.type !== 'image/svg+xml' && file.type !== 'image/gif') {
				uploadStatus = `Optimisation de ${file.name}...`;
				const result = await optimizeImageFile(file, { maxDimension: 2048, quality: 0.82 });
				if (result.wasOptimized) {
					uploadStatus = `Optimisé : ${formatBytes(result.originalSize)} ➔ ${formatBytes(result.optimizedSize)} (-${result.savedPercent}%)`;
				}
				fileToUpload = result.file;
			}

			uploadStatus = `Téléversement de ${fileToUpload.name}...`;

			const formData = new FormData();
			formData.append('file', fileToUpload);

			try {
				const res = await fetch('/api/media', {
					method: 'POST',
					body: formData
				});
				const data = await res.json();
				if (!res.ok) {
					uploadError = data.error || 'Erreur lors du téléversement';
				} else {
					mediaList = [data.media, ...mediaList];
				}
			} catch (e: any) {
				uploadError = e.message || 'Erreur réseau lors de l’envoi';
			}
		}

		isUploading = false;
		uploadStatus = null;
	}

	function insertSnippet(item: MediaItem) {
		const isImg = item.mime_type.startsWith('image/');
		let snippet = '';
		if (isImg) {
			snippet = `\n#image("${item.url}", width: 80%)\n`;
		} else {
			snippet = `\n#link("${item.url}")[${item.original_name}]\n`;
		}
		onSelect(snippet);
		isOpen = false;
	}
</script>

{#if isOpen}
	<div class="modal-overlay" onclick={() => (isOpen = false)} role="presentation">
		<div class="modal-card" onclick={(e) => e.stopPropagation()} role="dialog">
			<div class="modal-header">
				<h3>Médiathèque & Insertion Typst</h3>
				<button type="button" class="btn-close" onclick={() => (isOpen = false)}>✕</button>
			</div>

			<div class="modal-body">
				<!-- Upload zone -->
				<div
					class="drop-zone {dragOver ? 'drag-over' : ''}"
					ondragover={(e) => {
						e.preventDefault();
						dragOver = true;
					}}
					ondragleave={() => (dragOver = false)}
					ondrop={(e) => {
						e.preventDefault();
						dragOver = false;
						handleUpload(e.dataTransfer?.files || null);
					}}
				>
					<span class="drop-icon">📁</span>
					<p>Glissez-déposez des images ici, ou</p>
					<label class="btn btn-secondary btn-sm upload-label">
						<span>Parcourir les fichiers</span>
						<input
							type="file"
							accept="image/*,application/pdf"
							multiple
							onchange={(e) => handleUpload(e.currentTarget.files)}
							style="display: none;"
						/>
					</label>
					{#if isUploading}
						<span class="uploading-indicator">{uploadStatus || 'Téléversement en cours...'}</span>
					{/if}
				</div>

				{#if uploadError}
					<div class="alert alert-danger">{uploadError}</div>
				{/if}

				<!-- Media Grid -->
				<div class="media-grid">
					{#each mediaList as item}
						<div class="media-card" onclick={() => insertSnippet(item)} role="button" tabindex="0">
							<div class="media-thumb">
								{#if item.mime_type.startsWith('image/')}
									<img src={item.url} alt={item.original_name} loading="lazy" />
								{:else}
									<span class="file-icon">📄</span>
								{/if}
							</div>
							<div class="media-info">
								<span class="filename" title={item.original_name}>{item.original_name}</span>
								<span class="filesize">{(item.size / 1024).toFixed(0)} Ko</span>
							</div>
							<div class="insert-hint">Cliquer pour insérer</div>
						</div>
					{/each}

					{#if mediaList.length === 0 && !isUploading}
						<div class="no-media">Aucun média téléversé pour le moment.</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 200;
		padding: 1.5rem;
		backdrop-filter: blur(4px);
	}

	.modal-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		width: 100%;
		max-width: 750px;
		max-height: 85vh;
		display: flex;
		flex-direction: column;
		box-shadow: var(--shadow-lg);
	}

	.modal-header {
		padding: 1rem 1.5rem;
		border-bottom: 1px solid var(--border-color);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.btn-close {
		font-size: 1.2rem;
		color: var(--text-muted);
	}

	.modal-body {
		padding: 1.5rem;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.drop-zone {
		border: 2px dashed var(--border-color);
		border-radius: var(--radius-md);
		padding: 1.5rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		background: var(--bg-secondary);
		transition: border-color 0.15s ease;
	}

	.drop-zone.drag-over {
		border-color: var(--accent);
		background: var(--accent-light);
	}

	.drop-icon {
		font-size: 2rem;
	}

	.upload-label {
		cursor: pointer;
	}

	.uploading-indicator {
		font-size: 0.85rem;
		color: var(--accent);
	}

	.alert-danger {
		background-color: var(--danger-bg);
		color: var(--danger);
		padding: 0.75rem;
		border-radius: var(--radius-md);
		font-size: 0.85rem;
	}

	.media-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 1rem;
		max-height: 350px;
		overflow-y: auto;
		padding-right: 0.5rem;
	}

	.media-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		overflow: hidden;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		transition: all 0.15s ease;
		position: relative;
	}

	.media-card:hover {
		border-color: var(--accent);
		transform: translateY(-2px);
		box-shadow: var(--shadow-sm);
	}

	.media-thumb {
		height: 100px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-primary);
		overflow: hidden;
	}

	.media-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.file-icon {
		font-size: 2rem;
	}

	.media-info {
		padding: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.filename {
		font-size: 0.75rem;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.filesize {
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.insert-hint {
		font-size: 0.65rem;
		color: var(--accent);
		text-align: center;
		padding-bottom: 0.3rem;
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	.media-card:hover .insert-hint {
		opacity: 1;
	}

	.no-media {
		grid-column: 1 / -1;
		text-align: center;
		color: var(--text-muted);
		padding: 2rem;
	}
</style>
