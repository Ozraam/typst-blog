<script lang="ts">
	import { onMount } from 'svelte';
	import TagBadge from '$lib/components/TagBadge.svelte';
	import TableOfContents from '$lib/components/TableOfContents.svelte';
	import { compileToSvg, downloadPdf } from '$lib/typst/compiler.client';

	let { data } = $props<{
		data: {
			post: any;
			toc: any[];
			readingTime: number;
			user: any;
			siteTitle: string;
		};
	}>();

	let svgContent = $state(data.post.rendered_svg || '');
	let isCompiling = $state(false);
	let isDownloadingPdf = $state(false);
	let showSourceModal = $state(false);
	let copySuccess = $state(false);

	onMount(async () => {
		// If no cached SVG was stored in DB, compile on client
		if (!svgContent) {
			isCompiling = true;
			const res = await compileToSvg(data.post.content);
			if (res.svg) {
				svgContent = res.svg;
			}
			isCompiling = false;
		}
	});

	async function handleDownloadPdf() {
		try {
			isDownloadingPdf = true;
			await downloadPdf(data.post.content, data.post.slug);
		} catch (err) {
			alert('Erreur lors de la génération du PDF. Vérifiez la syntaxe Typst.');
			console.error(err);
		} finally {
			isDownloadingPdf = false;
		}
	}

	async function handleCopySource() {
		try {
			await navigator.clipboard.writeText(data.post.content);
			copySuccess = true;
			setTimeout(() => {
				copySuccess = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy source:', err);
		}
	}

	function formatDate(timestamp: number | null): string {
		if (!timestamp) return 'Non daté';
		return new Intl.DateTimeFormat('fr-FR', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		}).format(new Date(timestamp));
	}
</script>

<svelte:head>
	<title>{data.post.title} — {data.siteTitle}</title>
	{#if data.post.excerpt}
		<meta name="description" content={data.post.excerpt} />
	{/if}
</svelte:head>

<div class="article-page">
	<div class="article-header">
		<div class="meta-top">
			<a href="/" class="back-link">← Retour aux articles</a>
			{#if data.user && (data.user.role === 'admin' || data.user.role === 'author')}
				<a href="/admin/posts/{data.post.id}/edit" class="btn btn-secondary btn-sm">
					✏️ Modifier l'article
				</a>
			{/if}
		</div>

		<h1 class="article-title">{data.post.title}</h1>

		<div class="meta-bottom">
			<div class="author-date">
				<span class="author">{data.post.author_name || 'Auteur inconnu'}</span>
				<span>·</span>
				<time>{formatDate(data.post.published_at || data.post.created_at)}</time>
				<span>·</span>
				<span class="reading-time">{data.readingTime} min de lecture</span>
				{#if data.post.status !== 'published'}
					<span class="status-badge {data.post.status}">{data.post.status}</span>
				{/if}
			</div>

			<div class="actions">
				<button
					type="button"
					class="btn btn-secondary btn-sm"
					onclick={handleDownloadPdf}
					disabled={isDownloadingPdf}
					title="Exporter et télécharger le PDF"
				>
					{#if isDownloadingPdf}
						<span>⏳ Génération...</span>
					{:else}
						<span>📥 Télécharger PDF</span>
					{/if}
				</button>

				<button
					type="button"
					class="btn btn-secondary btn-sm"
					onclick={() => (showSourceModal = true)}
					title="Voir le code source Typst"
				>
					<span>⟨/⟩ Code Typst</span>
				</button>
			</div>
		</div>

		{#if data.post.tags && data.post.tags.length > 0}
			<div class="tags">
				{#each data.post.tags as tag}
					<TagBadge {tag} />
				{/each}
			</div>
		{/if}
	</div>

	<!-- Content Layout: Main SVG + Sidebar TOC -->
	<div class="article-layout">
		<main class="article-body">
			{#if isCompiling}
				<div class="compiling-state">
					<div class="spinner"></div>
					<p>Compilation du document Typst...</p>
				</div>
			{:else if svgContent}
				<div class="typst-doc-wrapper typst-content">
					{@html svgContent}
				</div>
			{:else}
				<div class="error-state">
					<p>Impossible d'afficher le document Typst.</p>
				</div>
			{/if}
		</main>

		{#if data.toc.length > 0}
			<aside class="article-sidebar">
				<TableOfContents items={data.toc} />
			</aside>
		{/if}
	</div>
</div>

<!-- Modal Source Typst -->
{#if showSourceModal}
	<div class="modal-overlay" onclick={() => (showSourceModal = false)} role="presentation">
		<div class="modal-card" onclick={(e) => e.stopPropagation()} role="dialog">
			<div class="modal-header">
				<h3>Code source Typst</h3>
				<div class="modal-actions">
					<button type="button" class="btn btn-secondary btn-sm" onclick={handleCopySource}>
						{copySuccess ? '✓ Copié !' : '📋 Copier'}
					</button>
					<button type="button" class="btn-close" onclick={() => (showSourceModal = false)}>✕</button>
				</div>
			</div>
			<div class="modal-body">
				<pre><code>{data.post.content}</code></pre>
			</div>
		</div>
	</div>
{/if}

<style>
	.article-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2.5rem 1.5rem 5rem;
		width: 100%;
	}

	.article-header {
		max-width: 850px;
		margin: 0 auto 3rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.meta-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.back-link {
		color: var(--text-muted);
		font-size: 0.9rem;
	}

	.back-link:hover {
		color: var(--accent);
	}

	.article-title {
		font-size: 2.5rem;
		line-height: 1.2;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--text-primary);
	}

	.meta-bottom {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--border-color);
	}

	.author-date {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
		font-size: 0.9rem;
		color: var(--text-secondary);
	}

	.author {
		font-weight: 600;
		color: var(--text-primary);
	}

	.status-badge {
		font-size: 0.75rem;
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
		text-transform: uppercase;
		font-weight: 700;
	}

	.status-badge.draft {
		background: var(--warning-bg);
		color: var(--warning);
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.article-layout {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2.5rem;
	}

	@media (min-width: 950px) {
		.article-layout {
			grid-template-columns: minmax(0, 1fr) 280px;
		}
	}

	.article-body {
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.article-sidebar {
		display: none;
	}

	@media (min-width: 950px) {
		.article-sidebar {
			display: block;
		}
	}

	.compiling-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem;
		color: var(--text-muted);
		gap: 1rem;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--border-color);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 1.5rem;
		backdrop-filter: blur(4px);
	}

	.modal-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		width: 100%;
		max-width: 800px;
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

	.modal-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.btn-close {
		font-size: 1.2rem;
		color: var(--text-muted);
	}

	.modal-body {
		padding: 1.5rem;
		overflow-y: auto;
		background: var(--bg-secondary);
	}

	.modal-body pre {
		font-family: var(--font-mono);
		font-size: 0.85rem;
		line-height: 1.5;
		white-space: pre-wrap;
	}
</style>
