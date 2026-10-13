<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { optimizeImageFile, formatBytes } from '$lib/utils/image-optimizer';

	let { data, form } = $props<{
		data: { media: any[] };
		form?: { error?: string; success?: boolean };
	}>();

	let copiedId = $state<string | null>(null);
	let isUploading = $state(false);
	let uploadStatus = $state<string | null>(null);
	let uploadError = $state<string | null>(null);
	let dragOver = $state(false);

	function copyTypstSnippet(item: any) {
		const isImg = item.mime_type.startsWith('image/');
		const snippet = isImg ? `#image("${item.url}", width: 80%)` : `#link("${item.url}")[${item.original_name}]`;
		navigator.clipboard.writeText(snippet);
		copiedId = item.id;
		setTimeout(() => {
			copiedId = null;
		}, 2000);
	}

	async function handleUploadFiles(files: FileList | null) {
		if (!files || files.length === 0) return;
		isUploading = true;
		uploadError = null;
		uploadStatus = null;

		for (const file of Array.from(files)) {
			let fileToUpload = file;

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
				const resData = await res.json();
				if (!res.ok) {
					uploadError = resData.error || 'Erreur lors du téléversement';
				}
			} catch (e: any) {
				uploadError = e.message || 'Erreur réseau lors du téléversement';
			}
		}

		await invalidateAll();
		isUploading = false;
		uploadStatus = null;
	}
</script>

<svelte:head>
	<title>Médiathèque — Typst Studio</title>
</svelte:head>

<div class="media-page">
	<header class="page-header">
		<div>
			<h1 class="page-title">Médiathèque</h1>
			<p class="page-subtitle">Téléversez vos images et documents utilisables dans les articles Typst</p>
		</div>
	</header>

	{#if uploadError || form?.error}
		<div class="alert alert-danger">{uploadError || form?.error}</div>
	{/if}

	<!-- Upload Area -->
	<div
		class="upload-box {dragOver ? 'drag-over' : ''}"
		ondragover={(e) => {
			e.preventDefault();
			dragOver = true;
		}}
		ondragleave={() => (dragOver = false)}
		ondrop={(e) => {
			e.preventDefault();
			dragOver = false;
			handleUploadFiles(e.dataTransfer?.files || null);
		}}
		role="region"
		aria-label="Zone de téléversement de fichiers"
	>
		<div class="upload-inner">
			<span class="upload-icon">📁</span>
			<div class="upload-text">
				<p class="primary-text">Glissez vos fichiers ici ou cliquez pour parcourir</p>
				<p class="secondary-text">Formats acceptés : PNG, JPEG, SVG, WebP, GIF, PDF (max 25 Mo — optimisation automatique des images)</p>
			</div>
			<label class="btn btn-primary btn-sm browse-btn">
				<span>Parcourir</span>
				<input
					type="file"
					accept="image/*,application/pdf"
					multiple
					style="display: none;"
					onchange={(e) => handleUploadFiles(e.currentTarget.files)}
				/>
			</label>
		</div>
		{#if isUploading}
			<div class="upload-overlay">
				<span>{uploadStatus || 'Téléversement en cours...'}</span>
			</div>
		{/if}
	</div>

	<!-- Media Gallery Grid -->
	<div class="gallery-section">
		<h2>Fichiers disponibles ({data.media.length})</h2>

		{#if data.media.length > 0}
			<div class="media-grid">
				{#each data.media as item}
					<div class="media-card">
						<div class="media-preview">
							{#if item.mime_type.startsWith('image/')}
								<img src={item.url} alt={item.original_name} loading="lazy" />
							{:else}
								<span class="file-icon">📄</span>
							{/if}
						</div>

						<div class="media-details">
							<span class="file-name" title={item.original_name}>{item.original_name}</span>
							<span class="file-meta">{(item.size / 1024).toFixed(0)} Ko</span>
						</div>

						<div class="media-actions">
							<button
								type="button"
								class="btn btn-secondary btn-sm copy-btn"
								onclick={() => copyTypstSnippet(item)}
								title="Copier le code Typst #image(...) ou #link(...)"
							>
								{copiedId === item.id ? '✓ Copié !' : '📋 Typst'}
							</button>

							<a href={item.url} target="_blank" class="btn btn-secondary btn-sm" title="Ouvrir">
								👁
							</a>

							<form
								method="post"
								action="?/delete"
								use:enhance
								onsubmit={(e: SubmitEvent) => {
									if (!confirm('Supprimer ce fichier média ? Les articles l’utilisant ne pourront plus l’afficher.')) {
										e.preventDefault();
									}
								}}
							>
								<input type="hidden" name="id" value={item.id} />
								<button type="submit" class="btn btn-danger btn-sm" title="Supprimer">
									🗑️
								</button>
							</form>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="empty-state">
				<p>Aucun fichier média pour le moment. Glissez un fichier ci-dessus pour commencer.</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.media-page {
		padding: 2rem;
		max-width: 1200px;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.page-title {
		font-size: 1.8rem;
		font-weight: 700;
	}

	.page-subtitle {
		color: var(--text-muted);
		font-size: 0.95rem;
	}

	.alert-danger {
		padding: 0.75rem 1rem;
		background: var(--danger-bg);
		color: var(--danger);
		border-radius: var(--radius-md);
		font-size: 0.85rem;
	}

	.upload-box {
		position: relative;
		border: 2px dashed var(--border-color);
		border-radius: var(--radius-lg);
		background: var(--bg-card);
		padding: 2rem;
		text-align: center;
		transition: all 0.15s ease;
	}

	.upload-box.drag-over {
		border-color: var(--accent);
		background: var(--accent-light);
	}

	.upload-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.upload-icon {
		font-size: 2.5rem;
	}

	.primary-text {
		font-weight: 600;
		color: var(--text-primary);
	}

	.secondary-text {
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.browse-btn {
		cursor: pointer;
		margin-top: 0.25rem;
	}

	.upload-overlay {
		position: absolute;
		inset: 0;
		background: rgba(255, 255, 255, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		color: var(--accent);
		border-radius: var(--radius-lg);
	}

	.gallery-section {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.gallery-section h2 {
		font-size: 1.2rem;
		font-weight: 600;
	}

	.media-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1.25rem;
	}

	.media-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: var(--shadow-sm);
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}

	.media-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
		border-color: var(--accent);
	}

	.media-preview {
		height: 140px;
		background: var(--bg-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.media-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.file-icon {
		font-size: 3rem;
	}

	.media-details {
		padding: 0.75rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.file-name {
		font-size: 0.85rem;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--text-primary);
	}

	.file-meta {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.media-actions {
		padding: 0.5rem 1rem 0.75rem;
		display: flex;
		gap: 0.4rem;
		border-top: 1px solid var(--border-light);
		align-items: center;
	}

	.copy-btn {
		flex: 1;
	}

	.empty-state {
		text-align: center;
		padding: 3rem;
		background: var(--bg-card);
		border: 1px dashed var(--border-color);
		border-radius: var(--radius-lg);
		color: var(--text-muted);
	}
</style>
