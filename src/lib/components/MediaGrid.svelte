<script lang="ts">
	import { Check, Copy, Download, ExternalLink, FileText, FileSpreadsheet, Trash, Upload } from '@lucide/svelte';
	import { formatBytes, formatShortDate } from '$lib/format';
	import { ACCEPTED_UPLOADS, typstSnippetFor, uploadFiles, type UploadedMedia } from '$lib/ui/upload';
	import { toast } from '$lib/ui/toast.svelte';
	import { confirm } from '$lib/ui/confirm.svelte';

	let {
		items = $bindable(),
		mode,
		currentUser,
		onpick
	}: {
		items: UploadedMedia[];
		mode: 'manage' | 'pick';
		currentUser: { id: string; role: string };
		onpick?: (item: UploadedMedia) => void;
	} = $props();

	let dragging = $state(false);
	let uploading = $state<string | null>(null);
	let filter = $state<'all' | 'images' | 'files'>('all');
	let query = $state('');
	let copiedId = $state<string | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);

	const visible = $derived(
		items.filter((item) => {
			const isImage = item.mime_type.startsWith('image/');
			if (filter === 'images' && !isImage) return false;
			if (filter === 'files' && isImage) return false;
			return !query || item.original_name.toLowerCase().includes(query.toLowerCase());
		})
	);

	async function handleFiles(files: FileList | File[] | null) {
		if (!files || files.length === 0) return;
		const { uploaded, errors } = await uploadFiles(Array.from(files), (status) => (uploading = status));
		uploading = null;
		items = [...uploaded, ...items];
		if (uploaded.length) toast.success(uploaded.length > 1 ? `${uploaded.length} fichiers importés.` : 'Fichier importé.');
		for (const error of errors) toast.error(error);
		if (mode === 'pick' && uploaded.length === 1) onpick?.(uploaded[0]);
	}

	async function copySnippet(item: UploadedMedia) {
		try {
			await navigator.clipboard.writeText(typstSnippetFor(item));
			copiedId = item.id;
			setTimeout(() => (copiedId = null), 1600);
		} catch {
			toast.error('Copie impossible dans ce navigateur.');
		}
	}

	async function remove(item: UploadedMedia) {
		const used = item.usage_count ?? 0;
		const ok = await confirm({
			title: 'Supprimer ce fichier ?',
			message: used
				? `« ${item.original_name} » est utilisé dans ${used} article${used > 1 ? 's' : ''} : ${used > 1 ? 'ils ne pourront' : 'il ne pourra'} plus être compilé${used > 1 ? 's' : ''}.`
				: `« ${item.original_name} » sera définitivement supprimé.`,
			confirmLabel: 'Supprimer',
			danger: true
		});
		if (!ok) return;
		const res = await fetch(`/api/media/${item.id}`, { method: 'DELETE' });
		if (res.ok) {
			items = items.filter((i) => i.id !== item.id);
			toast.success('Fichier supprimé.');
		} else {
			toast.error((await res.json().catch(() => ({}))).error ?? 'Suppression impossible.');
		}
	}

	const canDelete = (item: UploadedMedia) => currentUser.role === 'admin' || item.uploader_id === currentUser.id;
</script>

<div class="media">
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="dropzone"
		class:dragging
		ondragover={(e) => {
			e.preventDefault();
			dragging = true;
		}}
		ondragleave={() => (dragging = false)}
		ondrop={(e) => {
			e.preventDefault();
			dragging = false;
			handleFiles(e.dataTransfer?.files ?? null);
		}}
	>
		<span class="drop-icon"><Upload size={20} /></span>
		{#if uploading}
			<p class="drop-title">{uploading}</p>
		{:else}
			<p class="drop-title">Glissez vos fichiers ici ou <button type="button" class="link" onclick={() => fileInput?.click()}>parcourez</button></p>
			<p class="drop-hint">Images, PDF, données (CSV, JSON, YAML), bibliographies et modules Typst · 25 Mo max · les grandes images sont optimisées automatiquement</p>
		{/if}
		<input bind:this={fileInput} type="file" multiple accept={ACCEPTED_UPLOADS} hidden onchange={(e) => handleFiles(e.currentTarget.files)} />
	</div>

	{#if items.length}
		<div class="filters">
			<div class="segmented" role="group" aria-label="Type de fichier">
				<button type="button" class:active={filter === 'all'} onclick={() => (filter = 'all')}>Tous</button>
				<button type="button" class:active={filter === 'images'} onclick={() => (filter = 'images')}>Images</button>
				<button type="button" class:active={filter === 'files'} onclick={() => (filter = 'files')}>Documents</button>
			</div>
			<input class="input search" type="search" bind:value={query} placeholder="Filtrer par nom…" aria-label="Filtrer par nom" />
		</div>
	{/if}

	<div class="grid">
		{#each visible as item (item.id)}
			<div class="item" class:pickable={mode === 'pick'}>
				{#if mode === 'pick'}
					<button type="button" class="pick" onclick={() => onpick?.(item)} aria-label="Insérer {item.original_name}"></button>
				{/if}
				<div class="thumb">
					{#if item.mime_type.startsWith('image/')}
						<img src={item.url} alt="" loading="lazy" />
					{:else if /csv|json|yaml/.test(item.mime_type)}
						<FileSpreadsheet size={28} />
					{:else}
						<FileText size={28} />
					{/if}
				</div>
				<div class="info">
					<span class="name" title={item.original_name}>{item.original_name}</span>
					<span class="meta">
						{formatBytes(item.size)} · {formatShortDate(item.created_at)}
					</span>
					{#if mode === 'manage'}
						<span class="usage" class:unused={!item.usage_count}>
							{item.usage_count ? `Utilisé dans ${item.usage_count} article${item.usage_count > 1 ? 's' : ''}` : 'Inutilisé'}
						</span>
					{/if}
				</div>
				{#if mode === 'manage'}
					<div class="actions">
						<button type="button" class="btn btn-secondary btn-sm grow" onclick={() => copySnippet(item)} title="Copier le code Typst">
							{#if copiedId === item.id}<Check size={14} /> Copié{:else}<Copy size={14} /> Code Typst{/if}
						</button>
						<a href={item.url} target="_blank" rel="noopener" class="btn btn-ghost btn-sm btn-icon" title="Ouvrir" aria-label="Ouvrir"><ExternalLink size={14} /></a>
						<a href={item.url} download={item.original_name} class="btn btn-ghost btn-sm btn-icon" title="Télécharger" aria-label="Télécharger"><Download size={14} /></a>
						{#if canDelete(item)}
							<button type="button" class="btn btn-danger-ghost btn-sm btn-icon" onclick={() => remove(item)} title="Supprimer" aria-label="Supprimer"><Trash size={14} /></button>
						{/if}
					</div>
				{/if}
			</div>
		{:else}
			{#if items.length}
				<p class="none">Aucun fichier ne correspond.</p>
			{/if}
		{/each}
	</div>
</div>

<style>
	.media {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.dropzone {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		padding: 1.75rem 1.25rem;
		border: 1.5px dashed var(--border-strong);
		border-radius: var(--radius-lg);
		background: var(--surface);
		text-align: center;
		transition:
			border-color 0.15s var(--ease),
			background-color 0.15s var(--ease);
	}

	.dropzone.dragging {
		border-color: var(--accent);
		background: var(--accent-soft);
	}

	.drop-icon {
		display: grid;
		place-items: center;
		width: 2.6rem;
		height: 2.6rem;
		margin-bottom: 0.3rem;
		border-radius: 50%;
		background: var(--accent-soft);
		color: var(--accent);
	}

	.drop-title {
		font-weight: 600;
		font-size: 0.9rem;
	}

	.drop-hint {
		max-width: 36rem;
		font-size: 0.78rem;
		color: var(--text-3);
	}

	.link {
		color: var(--accent);
		font-weight: 600;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		justify-content: space-between;
	}

	.segmented {
		display: inline-flex;
		padding: 0.2rem;
		gap: 0.15rem;
		border-radius: var(--radius-md);
		background: var(--surface-2);
	}

	.segmented button {
		height: 1.9rem;
		padding: 0 0.75rem;
		border-radius: var(--radius-sm);
		font-size: 0.8125rem;
		font-weight: 550;
		color: var(--text-2);
	}

	.segmented button.active {
		background: var(--surface);
		color: var(--text);
		box-shadow: var(--shadow-sm);
	}

	.search {
		width: min(260px, 100%);
		min-height: 2.3rem;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
		gap: 1rem;
	}

	.item {
		position: relative;
		display: flex;
		flex-direction: column;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--surface);
		overflow: hidden;
		transition:
			border-color 0.15s var(--ease),
			box-shadow 0.15s var(--ease);
	}

	.item:hover {
		border-color: var(--border-strong);
		box-shadow: var(--shadow-md);
	}

	.pickable:hover {
		border-color: var(--accent);
	}

	.pick {
		position: absolute;
		inset: 0;
		z-index: 1;
	}

	.thumb {
		display: grid;
		place-items: center;
		aspect-ratio: 4 / 3;
		background:
			repeating-conic-gradient(var(--surface-2) 0% 25%, var(--surface) 0% 50%) 50% / 16px 16px;
		color: var(--text-3);
		border-bottom: 1px solid var(--border);
	}

	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.info {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		padding: 0.65rem 0.75rem;
		min-width: 0;
	}

	.name {
		font-size: 0.8125rem;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.meta {
		font-size: 0.72rem;
		color: var(--text-3);
	}

	.usage {
		margin-top: 0.25rem;
		font-size: 0.72rem;
		font-weight: 550;
		color: var(--success);
	}

	.usage.unused {
		color: var(--text-3);
	}

	.actions {
		display: flex;
		gap: 0.15rem;
		padding: 0 0.5rem 0.6rem;
	}

	.grow {
		flex: 1;
	}

	.none {
		grid-column: 1 / -1;
		padding: 2rem;
		text-align: center;
		color: var(--text-3);
		font-size: 0.875rem;
	}
</style>
