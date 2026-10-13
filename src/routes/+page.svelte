<script lang="ts">
	import PostCard from '$lib/components/PostCard.svelte';
	import TagBadge from '$lib/components/TagBadge.svelte';

	let { data } = $props<{
		data: {
			posts: any[];
			total: number;
			page: number;
			totalPages: number;
			tags: any[];
			activeTag?: string;
			searchQuery: string;
			siteTitle: string;
			siteDescription: string;
			user: any;
		};
	}>();
</script>

<svelte:head>
	<title>{data.siteTitle} — {data.siteDescription}</title>
</svelte:head>

<div class="home-container">
	<!-- Hero / Intro -->
	<section class="hero">
		<h1 class="hero-title">{data.siteTitle}</h1>
		<p class="hero-desc">{data.siteDescription}</p>
	</section>

	<!-- Search & Filters -->
	<section class="filter-section">
		<form method="get" action="/" class="search-form">
			<input
				type="text"
				name="q"
				value={data.searchQuery}
				placeholder="Rechercher un article..."
				class="input search-input"
			/>
			{#if data.activeTag}
				<input type="hidden" name="tag" value={data.activeTag} />
			{/if}
			<button type="submit" class="btn btn-primary">Rechercher</button>
			{#if data.searchQuery || data.activeTag}
				<a href="/" class="btn btn-secondary">Réinitialiser</a>
			{/if}
		</form>

		{#if data.tags.length > 0}
			<div class="tags-cloud">
				<a href="/" class="all-tags-btn {!data.activeTag ? 'active' : ''}">
					Tous ({data.total})
				</a>
				{#each data.tags as tag}
					<TagBadge tag={tag.name} active={data.activeTag === tag.name} count={tag.post_count} />
				{/each}
			</div>
		{/if}
	</section>

	<!-- Articles List -->
	<section class="articles-section">
		{#if data.posts.length > 0}
			<div class="posts-list">
				{#each data.posts as post}
					<PostCard {post} />
				{/each}
			</div>

			<!-- Pagination -->
			{#if data.totalPages > 1}
				<nav class="pagination" aria-label="Pagination">
					{#if data.page > 1}
						<a
							href="/?p={data.page - 1}{data.activeTag ? `&tag=${encodeURIComponent(data.activeTag)}` : ''}{data.searchQuery ? `&q=${encodeURIComponent(data.searchQuery)}` : ''}"
							class="btn btn-secondary btn-sm"
						>
							← Précédent
						</a>
					{/if}

					<span class="page-indicator">
						Page {data.page} sur {data.totalPages}
					</span>

					{#if data.page < data.totalPages}
						<a
							href="/?p={data.page + 1}{data.activeTag ? `&tag=${encodeURIComponent(data.activeTag)}` : ''}{data.searchQuery ? `&q=${encodeURIComponent(data.searchQuery)}` : ''}"
							class="btn btn-secondary btn-sm"
						>
							Suivant →
						</a>
					{/if}
				</nav>
			{/if}
		{:else}
			<div class="empty-state">
				<div class="empty-icon">📝</div>
				<h3>Aucun article trouvé</h3>
				<p>
					{#if data.searchQuery || data.activeTag}
						Aucun article ne correspond à vos critères de recherche.
					{:else}
						Bienvenue sur votre nouveau blog Typst ! Aucun article n'a encore été publié.
					{/if}
				</p>
				{#if data.user}
					<a href="/admin/posts/new" class="btn btn-primary" style="margin-top: 1rem;">
						Rédiger le premier article
					</a>
				{/if}
			</div>
		{/if}
	</section>
</div>

<style>
	.home-container {
		max-width: 900px;
		margin: 0 auto;
		padding: 3rem 1.5rem;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
	}

	.hero {
		text-align: center;
		padding: 1rem 0;
	}

	.hero-title {
		font-size: 2.5rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
	}

	.hero-desc {
		font-size: 1.15rem;
		color: var(--text-secondary);
		max-width: 600px;
		margin: 0 auto;
	}

	.filter-section {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		background: var(--bg-card);
		padding: 1.25rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
	}

	.search-form {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.search-input {
		flex: 1;
		min-width: 200px;
	}

	.tags-cloud {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	.all-tags-btn {
		font-size: 0.8rem;
		font-weight: 600;
		padding: 0.2rem 0.6rem;
		border-radius: 9999px;
		background: var(--bg-secondary);
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
	}

	.all-tags-btn.active,
	.all-tags-btn:hover {
		background: var(--accent);
		color: var(--accent-contrast);
		border-color: var(--accent);
	}

	.posts-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		margin-top: 2rem;
	}

	.page-indicator {
		font-size: 0.9rem;
		color: var(--text-muted);
	}

	.empty-state {
		text-align: center;
		padding: 4rem 1.5rem;
		background: var(--bg-card);
		border: 1px dashed var(--border-color);
		border-radius: var(--radius-lg);
	}

	.empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.empty-state h3 {
		font-size: 1.25rem;
		margin-bottom: 0.5rem;
	}

	.empty-state p {
		color: var(--text-muted);
	}
</style>
