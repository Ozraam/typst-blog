<script lang="ts">
	import { goto } from '$app/navigation';
	import { ChevronLeft, ChevronRight, FileText, Search, X } from '@lucide/svelte';
	import PostCard from '$lib/components/PostCard.svelte';
	import { plural } from '$lib/format';

	let { data } = $props();

	let query = $derived(data.searchQuery);
	const filtered = $derived(!!data.searchQuery || !!data.activeTag);
	const featured = $derived(!filtered && data.page === 1 && data.posts.length > 1);

	function href(params: { p?: number; tag?: string | null; q?: string }) {
		const search = new URLSearchParams();
		const tag = params.tag === undefined ? data.activeTag : params.tag;
		const q = params.q === undefined ? data.searchQuery : params.q;
		if (q) search.set('q', q);
		if (tag) search.set('tag', tag);
		if (params.p && params.p > 1) search.set('p', String(params.p));
		const qs = search.toString();
		return qs ? `/?${qs}` : '/';
	}

	function submit(e: SubmitEvent) {
		e.preventDefault();
		goto(href({ q: query.trim(), p: 1 }), { keepFocus: true, noScroll: true });
	}

	const activeTagName = $derived(data.tags.find((t) => t.slug === data.activeTag)?.name ?? data.activeTag);
</script>

<svelte:head>
	<title>{data.searchQuery ? `« ${data.searchQuery} » — ` : activeTagName ? `#${activeTagName} — ` : ''}{data.siteTitle}</title>
	<meta name="description" content={data.siteDescription} />
	<meta property="og:title" content={data.siteTitle} />
	<meta property="og:description" content={data.siteDescription} />
	<meta property="og:type" content="website" />
</svelte:head>

<div class="container home">
	<section class="hero">
		<h1>{data.siteTitle}</h1>
		{#if data.siteDescription}<p>{data.siteDescription}</p>{/if}
	</section>

	<section class="filters" aria-label="Filtrer les articles">
		<form class="search" onsubmit={submit} role="search">
			<Search size={17} />
			<input type="search" name="q" bind:value={query} placeholder="Rechercher dans les articles…" aria-label="Rechercher dans les articles" />
			{#if data.searchQuery}
				<a href={href({ q: '', p: 1 })} class="clear" aria-label="Effacer la recherche" data-sveltekit-noscroll><X size={15} /></a>
			{/if}
		</form>

		{#if data.tags.length}
			<div class="tags">
				<a href={href({ tag: null, p: 1 })} class="chip" class:active={!data.activeTag} data-sveltekit-noscroll>Tous</a>
				{#each data.tags as tag}
					<a

						href={href({ tag: data.activeTag === tag.slug ? null : tag.slug, p: 1 })}
						class="chip"
						class:active={data.activeTag === tag.slug}
						data-sveltekit-noscroll
					>
						{tag.name}<span class="count">{tag.post_count}</span>
					</a>
				{/each}
			</div>
		{/if}
	</section>

	{#if filtered}
		<p class="result-summary">
			{plural(data.total, 'article')}
			{#if data.searchQuery}pour « <strong>{data.searchQuery}</strong> »{/if}
			{#if activeTagName}dans <strong>#{activeTagName}</strong>{/if}
		</p>
	{/if}

	<section class="posts" aria-label="Articles">
		{#each data.posts as post, i (post.id)}
			<PostCard {post} featured={featured && i === 0} />
		{:else}
			<div class="card empty-state">
				<div class="empty-state-icon"><FileText size={22} /></div>
				{#if filtered}
					<h3>Aucun résultat</h3>
					<p>Aucun article ne correspond à votre recherche. Essayez d'autres mots-clés.</p>
					<a href="/" class="btn btn-secondary btn-sm">Voir tous les articles</a>
				{:else}
					<h3>Aucun article pour l'instant</h3>
					<p>Les articles publiés apparaîtront ici.</p>
					{#if data.user}
						<a href="/admin/posts/new" class="btn btn-primary btn-sm">Écrire le premier article</a>
					{/if}
				{/if}
			</div>
		{/each}
	</section>

	{#if data.totalPages > 1}
		<nav class="pagination" aria-label="Pagination">
			{#if data.page > 1}
				<a class="btn btn-secondary btn-sm" href={href({ p: data.page - 1 })} rel="prev"><ChevronLeft size={16} /> Plus récents</a>
			{:else}
				<span></span>
			{/if}
			<span class="page-indicator">Page {data.page} / {data.totalPages}</span>
			{#if data.page < data.totalPages}
				<a class="btn btn-secondary btn-sm" href={href({ p: data.page + 1 })} rel="next">Plus anciens <ChevronRight size={16} /></a>
			{:else}
				<span></span>
			{/if}
		</nav>
	{/if}
</div>

<style>
	.home {
		max-width: 820px;
		padding-top: clamp(2.5rem, 7vw, 5rem);
	}

	.hero h1 {
		font-family: var(--font-serif);
		font-size: clamp(2.5rem, 7vw, 3.9rem);
		font-weight: 550;
		letter-spacing: -0.025em;
		line-height: 1.05;
		text-wrap: balance;
	}

	.hero p {
		margin-top: 1rem;
		max-width: 36rem;
		font-size: 1.15rem;
		line-height: 1.55;
		color: var(--text-2);
		text-wrap: pretty;
	}

	.filters {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin: 2.5rem 0 1.25rem;
	}

	.search {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		height: 2.9rem;
		padding: 0 0.6rem 0 1rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-md);
		background: var(--surface);
		color: var(--text-3);
		box-shadow: var(--shadow-sm);
		transition:
			border-color 0.15s var(--ease),
			box-shadow 0.15s var(--ease);
	}

	.search:focus-within {
		border-color: var(--accent);
		box-shadow: var(--ring);
	}

	.search input {
		flex: 1;
		min-width: 0;
		height: 100%;
		border: none;
		outline: none;
		background: none;
		color: var(--text);
		font-size: 0.95rem;
	}

	.search input::-webkit-search-cancel-button {
		display: none;
	}

	.clear {
		display: flex;
		padding: 0.35rem;
		border-radius: 50%;
	}

	.clear:hover {
		background: var(--surface-2);
		color: var(--text);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		height: 1.9rem;
		padding: 0 0.75rem;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--text-2);
		font-size: 0.8125rem;
		font-weight: 500;
		transition: all 0.15s var(--ease);
	}

	.chip:hover {
		border-color: var(--border-strong);
		color: var(--text);
	}

	.chip.active {
		background: var(--text);
		border-color: var(--text);
		color: var(--bg);
	}

	.count {
		font-size: 0.72rem;
		color: var(--text-3);
		font-variant-numeric: tabular-nums;
	}

	.chip.active .count {
		color: inherit;
		opacity: 0.7;
	}

	.result-summary {
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		color: var(--text-2);
	}

	.result-summary strong {
		color: var(--text);
	}

	.posts > :global(.empty-state) {
		margin-top: 1rem;
	}

	.pagination {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 1rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border);
	}

	.page-indicator {
		font-size: 0.8125rem;
		color: var(--text-3);
		font-variant-numeric: tabular-nums;
	}
</style>
