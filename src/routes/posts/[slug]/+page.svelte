<script lang="ts">
	import { onMount } from 'svelte';
	import {
		ArrowLeft,
		ArrowRight,
		Check,
		Clock,
		Copy,
		Download,
		FileCode,
		Link2,
		ListTree,
		LoaderCircle,
		SquarePen,
		TriangleAlert
	} from '@lucide/svelte';
	import TypstDocument from '$lib/components/TypstDocument.svelte';
	import TableOfContents from '$lib/components/TableOfContents.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { formatDate, initials, isoDate, STATUS_LABELS } from '$lib/format';
	import { toast } from '$lib/ui/toast.svelte';
	import type { TocEntry } from '$lib/typst/engine';

	let { data } = $props();

	const post = $derived(data.post);

	// Client-side fallback when the server could not render the article
	let clientRender = $state<{ svg: string; toc: TocEntry[] } | null>(null);
	let renderFailed = $state(false);
	const svg = $derived(data.svg ?? clientRender?.svg ?? null);
	const toc = $derived(data.svg ? data.toc : (clientRender?.toc ?? []));

	let documentView = $state<ReturnType<typeof TypstDocument> | null>(null);
	let activeHeading = $state(-1);
	let progress = $state(0);
	let exportingPdf = $state(false);
	let sourceOpen = $state(false);
	let source = $state<string | null>(null);
	let copied = $state<'link' | 'source' | null>(null);

	const updated = $derived(
		post.published_at && post.updated_at - post.published_at > 24 * 3600 * 1000 ? post.updated_at : null
	);

	onMount(() => {
		if (!data.svg && data.fallbackContent !== null) {
			import('$lib/typst/client')
				.then(({ compileForWeb }) => compileForWeb(data.fallbackContent ?? ''))
				.then((result) => {
					if (result.svg) clientRender = { svg: result.svg, toc: result.toc };
					else renderFailed = true;
				})
				.catch(() => (renderFailed = true));
		}
	});

	function onScroll() {
		const doc = document.documentElement;
		const max = doc.scrollHeight - window.innerHeight;
		progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;

		if (!documentView || toc.length === 0) return;
		const threshold = window.scrollY + 120;
		let current = -1;
		for (let i = 0; i < toc.length; i++) {
			const y = documentView.pageYOf(toc[i].y);
			if (y !== null && y <= threshold) current = i;
		}
		activeHeading = current;
	}

	async function fetchSource(): Promise<string> {
		if (source !== null) return source;
		const res = await fetch(`/posts/${post.slug}/source.typ`);
		if (!res.ok) throw new Error('Source indisponible');
		source = await res.text();
		return source;
	}

	async function exportPdf() {
		exportingPdf = true;
		try {
			const [content, client] = await Promise.all([fetchSource(), import('$lib/typst/client')]);
			const result = await client.compilePdf(content, post.title);
			if (!result.pdf) throw new Error(result.diagnostics[0]?.message ?? 'Compilation impossible');
			client.downloadBlob(result.pdf as Uint8Array<ArrayBuffer>, `${post.slug}.pdf`, 'application/pdf');
		} catch (err) {
			toast.error(`Export PDF impossible : ${err instanceof Error ? err.message : err}`);
		} finally {
			exportingPdf = false;
		}
	}

	async function openSource() {
		sourceOpen = true;
		try {
			await fetchSource();
		} catch {
			toast.error('Impossible de charger la source.');
			sourceOpen = false;
		}
	}

	async function copy(kind: 'link' | 'source') {
		try {
			await navigator.clipboard.writeText(kind === 'link' ? location.href : await fetchSource());
			copied = kind;
			setTimeout(() => (copied = null), 1800);
		} catch {
			toast.error('Copie impossible dans ce navigateur.');
		}
	}

	async function share() {
		if (navigator.share && matchMedia('(pointer: coarse)').matches) {
			navigator.share({ title: post.title, url: location.href }).catch(() => {});
		} else {
			copy('link');
		}
	}

	function downloadSource() {
		import('$lib/typst/client').then(({ downloadBlob }) =>
			downloadBlob(source ?? '', `${post.slug}.typ`, 'text/plain;charset=utf-8')
		);
	}
</script>

<svelte:window onscroll={onScroll} onresize={onScroll} />

<svelte:head>
	<title>{post.title} — {data.siteTitle}</title>
	{#if post.excerpt}<meta name="description" content={post.excerpt} />{/if}
	<meta property="og:title" content={post.title} />
	<meta property="og:type" content="article" />
	{#if post.excerpt}<meta property="og:description" content={post.excerpt} />{/if}
	{#if post.published_at}<meta property="article:published_time" content={isoDate(post.published_at)} />{/if}
	{#each post.tags as tag}<meta property="article:tag" content={tag} />{/each}
	{#if post.status !== 'published'}<meta name="robots" content="noindex" />{/if}
</svelte:head>

<div class="progress" style:transform="scaleX({progress})" aria-hidden="true"></div>

<article class="article">
	<header class="container article-header">
		{#if post.status !== 'published'}
			<div class="alert alert-warning status-banner">
				<TriangleAlert size={16} />
				<span>
					<strong>{STATUS_LABELS[post.status]}</strong> —
					{post.status === 'archived'
						? 'cet article n’apparaît plus dans la liste mais reste accessible par son lien.'
						: 'cet aperçu n’est visible que par vous.'}
				</span>
			</div>
		{/if}

		{#if post.tags.length}
			<ul class="tags">
				{#each post.tags as tag}
					<li><a href="/?tag={encodeURIComponent(tag)}">{tag}</a></li>
				{/each}
			</ul>
		{/if}

		<h1>{post.title}</h1>
		{#if post.excerpt}<p class="lead">{post.excerpt}</p>{/if}

		<div class="byline">
			<div class="author">
				<span class="avatar" aria-hidden="true">{initials(post.author_name)}</span>
				<div>
					<span class="name">{post.author_name}</span>
					<span class="dates">
						<time datetime={isoDate(post.published_at ?? post.created_at)}>{formatDate(post.published_at ?? post.created_at)}</time>
						<span aria-hidden="true">·</span>
						<span class="reading"><Clock size={13} /> {data.readingTime} min</span>
						{#if updated}<span aria-hidden="true">·</span><span>mis à jour le {formatDate(updated)}</span>{/if}
					</span>
				</div>
			</div>

			<div class="actions">
				{#if data.canEdit}
					<a href="/admin/posts/{post.id}/edit" class="btn btn-secondary btn-sm"><SquarePen size={15} /> Modifier</a>
				{/if}
				<button type="button" class="btn btn-ghost btn-sm" onclick={exportPdf} disabled={exportingPdf} title="Télécharger en PDF">
					{#if exportingPdf}<LoaderCircle size={15} class="spinner" />{:else}<Download size={15} />{/if}
					PDF
				</button>
				<button type="button" class="btn btn-ghost btn-sm" onclick={openSource} title="Voir la source Typst">
					<FileCode size={15} /> Source
				</button>
				<button type="button" class="btn btn-ghost btn-sm btn-icon" onclick={share} title="Copier le lien" aria-label="Copier le lien">
					{#if copied === 'link'}<Check size={15} />{:else}<Link2 size={15} />{/if}
				</button>
			</div>
		</div>
	</header>

	<div class="layout">
		<div class="doc-column">
			{#if toc.length > 1}
				<details class="toc-mobile">
					<summary><ListTree size={16} /> Sommaire</summary>
					<TableOfContents items={toc} active={activeHeading} onselect={(item) => documentView?.scrollToY(item.y)} />
				</details>
			{/if}

			{#if svg}
				<TypstDocument {svg} bind:this={documentView} />
			{:else if renderFailed}
				<div class="card empty-state">
					<div class="empty-state-icon"><TriangleAlert size={22} /></div>
					<h3>Affichage impossible</h3>
					<p>Le document n'a pas pu être compilé. Vous pouvez consulter sa source Typst.</p>
				</div>
			{:else}
				<div class="paper-skeleton" aria-busy="true" aria-label="Chargement du document">
					<div class="skeleton" style="width: 55%; height: 1.6rem"></div>
					<div class="skeleton" style="width: 100%"></div>
					<div class="skeleton" style="width: 94%"></div>
					<div class="skeleton" style="width: 97%"></div>
					<div class="skeleton" style="width: 60%"></div>
				</div>
			{/if}
		</div>

		{#if toc.length > 1}
			<aside class="toc-aside" aria-label="Sommaire">
				<div class="toc-sticky">
					<p class="toc-title">Sommaire</p>
					<TableOfContents items={toc} active={activeHeading} onselect={(item) => documentView?.scrollToY(item.y)} />
				</div>
			</aside>
		{/if}
	</div>

	{#if data.adjacent.previous || data.adjacent.next}
		<nav class="container adjacent" aria-label="Articles voisins">
			{#if data.adjacent.next}
				<a href="/posts/{data.adjacent.next.slug}" class="adjacent-link">
					<span class="label"><ArrowLeft size={14} /> Article suivant</span>
					<span class="title">{data.adjacent.next.title}</span>
				</a>
			{:else}<span></span>{/if}
			{#if data.adjacent.previous}
				<a href="/posts/{data.adjacent.previous.slug}" class="adjacent-link right">
					<span class="label">Article précédent <ArrowRight size={14} /></span>
					<span class="title">{data.adjacent.previous.title}</span>
				</a>
			{/if}
		</nav>
	{/if}
</article>

<Modal open={sourceOpen} onclose={() => (sourceOpen = false)} size="lg" labelledby="source-title">
	<div class="source-header">
		<h2 id="source-title"><FileCode size={18} /> Source Typst</h2>
		<div class="source-actions">
			<button type="button" class="btn btn-secondary btn-sm" onclick={() => copy('source')} disabled={source === null}>
				{#if copied === 'source'}<Check size={14} /> Copié{:else}<Copy size={14} /> Copier{/if}
			</button>
			<button type="button" class="btn btn-secondary btn-sm" onclick={downloadSource} disabled={source === null}>
				<Download size={14} /> .typ
			</button>
			<button type="button" class="btn btn-ghost btn-sm" onclick={() => (sourceOpen = false)}>Fermer</button>
		</div>
	</div>
	<div class="source-body">
		{#if source === null}
			<LoaderCircle size={20} class="spinner" />
		{:else}
			<pre><code>{source}</code></pre>
		{/if}
	</div>
</Modal>

<style>
	.progress {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		z-index: 60;
		background: var(--accent);
		transform-origin: 0 0;
		pointer-events: none;
	}

	.article-header {
		max-width: 780px;
		padding-top: clamp(2rem, 6vw, 4rem);
		padding-bottom: 2.25rem;
	}

	.status-banner {
		margin-bottom: 1.75rem;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		list-style: none;
		margin-bottom: 1.1rem;
	}

	.tags a {
		display: inline-block;
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		background: var(--accent-soft);
		color: var(--accent);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}

	.tags a:hover {
		background: var(--accent-soft-2);
	}

	h1 {
		font-family: var(--font-serif);
		font-size: clamp(2.1rem, 5.5vw, 3.2rem);
		font-weight: 550;
		line-height: 1.1;
		letter-spacing: -0.02em;
		text-wrap: balance;
	}

	.lead {
		margin-top: 1rem;
		font-size: 1.2rem;
		line-height: 1.55;
		color: var(--text-2);
		text-wrap: pretty;
	}

	.byline {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 2rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--border);
	}

	.author {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.avatar {
		display: grid;
		place-items: center;
		width: 2.4rem;
		height: 2.4rem;
		border-radius: 50%;
		background: var(--accent-soft-2);
		color: var(--accent);
		font-weight: 650;
	}

	.name {
		display: block;
		font-weight: 600;
		font-size: 0.9rem;
	}

	.dates {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8125rem;
		color: var(--text-3);
	}

	.reading {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		justify-items: center;
		padding-inline: clamp(0.5rem, 3vw, 2rem);
	}

	.doc-column {
		width: 100%;
		max-width: 760px;
	}

	.toc-aside {
		display: none;
	}

	@media (min-width: 1240px) {
		.layout {
			grid-template-columns: minmax(0, 1fr) minmax(0, 760px) minmax(0, 1fr);
			column-gap: 3rem;
		}

		.doc-column {
			grid-column: 2;
		}

		.toc-aside {
			display: block;
			grid-column: 3;
			justify-self: start;
			width: 100%;
			max-width: 250px;
		}

		.toc-mobile {
			display: none;
		}
	}

	.toc-sticky {
		position: sticky;
		top: calc(var(--header-h) + 1.5rem);
		max-height: calc(100vh - var(--header-h) - 3rem);
		overflow-y: auto;
	}

	.toc-title {
		margin-bottom: 0.75rem;
		font-size: 0.72rem;
		font-weight: 650;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-3);
	}

	.toc-mobile {
		margin-bottom: 1.25rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--surface);
	}

	.toc-mobile summary {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		list-style: none;
	}

	.toc-mobile[open] summary {
		border-bottom: 1px solid var(--border);
	}

	.toc-mobile :global(.toc) {
		margin: 0.75rem 1rem 1rem;
	}

	.paper-skeleton {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		padding: 3rem;
		background: var(--surface);
		border-radius: var(--radius-sm);
		box-shadow: var(--paper-shadow);
	}

	.paper-skeleton .skeleton {
		height: 0.85rem;
	}

	.adjacent {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		max-width: 820px;
		margin-top: 3.5rem;
	}

	.adjacent-link {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 1.1rem 1.25rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
		transition:
			border-color 0.15s var(--ease),
			box-shadow 0.15s var(--ease);
	}

	.adjacent-link:hover {
		border-color: var(--border-strong);
		box-shadow: var(--shadow-md);
	}

	.adjacent-link.right {
		text-align: right;
		align-items: flex-end;
		grid-column: 2;
	}

	.label {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.75rem;
		color: var(--text-3);
	}

	.adjacent-link .title {
		font-family: var(--font-serif);
		font-size: 1.1rem;
		font-weight: 600;
		line-height: 1.3;
	}

	@media (max-width: 640px) {
		/* Full-bleed document: every pixel counts for the fixed-layout render */
		.layout {
			padding-inline: 0;
		}

		.layout :global(.paper) {
			border-radius: 0;
		}

		.toc-mobile {
			margin-inline: 1rem;
		}

		.adjacent {
			grid-template-columns: 1fr;
		}

		.adjacent-link.right {
			grid-column: 1;
		}
	}

	.source-header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--border);
	}

	.source-header h2 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1rem;
	}

	.source-actions {
		display: flex;
		gap: 0.4rem;
	}

	.source-body {
		display: flex;
		justify-content: center;
		overflow: auto;
		background: var(--surface-2);
		min-height: 8rem;
		padding: 1.25rem;
	}

	.source-body pre {
		width: 100%;
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		line-height: 1.65;
		white-space: pre-wrap;
		word-break: break-word;
	}
</style>
