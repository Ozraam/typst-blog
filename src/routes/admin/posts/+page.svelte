<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props<{
		data: {
			posts: any[];
			total: number;
			counts: Record<string, number>;
			activeStatus: string;
			searchQuery: string;
			page: number;
			totalPages: number;
		};
	}>();

	function formatDate(timestamp: number): string {
		return new Intl.DateTimeFormat('fr-FR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(timestamp));
	}
</script>

<svelte:head>
	<title>Gestion des articles — Typst Studio</title>
</svelte:head>

<div class="posts-manager-page">
	<header class="page-header">
		<div>
			<h1 class="page-title">Articles</h1>
			<p class="page-subtitle">Gérez vos publications, brouillons et révisions</p>
		</div>
		<a href="/admin/posts/new" class="btn btn-primary">
			<span>✍️ Nouvel article</span>
		</a>
	</header>

	<!-- Filters & Status tabs -->
	<div class="controls-card">
		<nav class="status-tabs">
			<a
				href="/admin/posts?status=all"
				class="status-tab {data.activeStatus === 'all' ? 'active' : ''}"
			>
				Tous <span class="tab-badge">{data.counts.all || 0}</span>
			</a>
			<a
				href="/admin/posts?status=published"
				class="status-tab {data.activeStatus === 'published' ? 'active' : ''}"
			>
				Publiés <span class="tab-badge">{data.counts.published || 0}</span>
			</a>
			<a
				href="/admin/posts?status=draft"
				class="status-tab {data.activeStatus === 'draft' ? 'active' : ''}"
			>
				Brouillons <span class="tab-badge">{data.counts.draft || 0}</span>
			</a>
			<a
				href="/admin/posts?status=archived"
				class="status-tab {data.activeStatus === 'archived' ? 'active' : ''}"
			>
				Archivés <span class="tab-badge">{data.counts.archived || 0}</span>
			</a>
			<a
				href="/admin/posts?status=trash"
				class="status-tab trash-tab {data.activeStatus === 'trash' ? 'active' : ''}"
			>
				Corbeille <span class="tab-badge">{data.counts.trash || 0}</span>
			</a>
		</nav>

		<form method="get" action="/admin/posts" class="search-form">
			<input type="hidden" name="status" value={data.activeStatus} />
			<input
				type="text"
				name="q"
				value={data.searchQuery}
				placeholder="Rechercher par titre ou slug..."
				class="input input-sm search-input"
			/>
			<button type="submit" class="btn btn-secondary btn-sm">Filtrer</button>
			{#if data.searchQuery}
				<a href="/admin/posts?status={data.activeStatus}" class="btn btn-secondary btn-sm">✕</a>
			{/if}
		</form>
	</div>

	<!-- Posts Table -->
	<div class="table-card">
		{#if data.posts.length > 0}
			<div class="table-wrapper">
				<table class="posts-table">
					<thead>
						<tr>
							<th>Titre</th>
							<th>Statut</th>
							<th>Auteur</th>
							<th>Tags</th>
							<th>Dernière modif.</th>
							<th class="actions-header">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each data.posts as post}
							<tr>
								<td class="title-cell">
									<a href="/admin/posts/{post.id}/edit" class="post-title">
										{post.title}
									</a>
									<span class="post-slug">/{post.slug}</span>
								</td>

								<td>
									<span class="status-badge {post.status}">{post.status}</span>
								</td>

								<td>{post.author_name}</td>

								<td>
									{#if post.tags && post.tags.length > 0}
										<div class="tags-mini">
											{#each post.tags as tag}
												<span class="tag-pill">#{tag}</span>
											{/each}
										</div>
									{:else}
										<span class="empty-cell">—</span>
									{/if}
								</td>

								<td>{formatDate(post.updated_at)}</td>

								<td>
									<div class="actions-group">
										{#if post.status !== 'trash'}
											<a href="/admin/posts/{post.id}/edit" class="btn btn-secondary btn-sm">
												Éditer
											</a>

											{#if post.status === 'published'}
												<a
													href="/posts/{post.slug}"
													target="_blank"
													class="btn btn-secondary btn-sm"
													title="Ouvrir dans un nouvel onglet"
												>
													👁
												</a>
											{/if}

											<!-- Trash form -->
											<form method="post" action="?/trash" use:enhance>
												<input type="hidden" name="id" value={post.id} />
												<button
													type="submit"
													class="btn btn-secondary btn-sm trash-btn"
													title="Mettre à la corbeille"
												>
													🗑️
												</button>
											</form>
										{:else}
											<!-- Restore from trash -->
											<form method="post" action="?/restore" use:enhance>
												<input type="hidden" name="id" value={post.id} />
												<button type="submit" class="btn btn-secondary btn-sm">
													Restaurer
												</button>
											</form>

											<!-- Permanent Purge -->
											<form
												method="post"
												action="?/deletePermanent"
												use:enhance
												onsubmit={(e) => {
													if (!confirm('Supprimer définitivement cet article ? Cette action est irréversible.')) {
														e.preventDefault();
													}
												}}
											>
												<input type="hidden" name="id" value={post.id} />
												<button type="submit" class="btn btn-danger btn-sm">
													Purger
												</button>
											</form>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="empty-state">
				<p>Aucun article trouvé dans cette catégorie.</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.posts-manager-page {
		padding: 2rem;
		max-width: 1200px;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.page-title {
		font-size: 1.8rem;
		font-weight: 700;
	}

	.page-subtitle {
		color: var(--text-muted);
		font-size: 0.95rem;
	}

	.controls-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 0.8rem 1.25rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.status-tabs {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.status-tab {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.75rem;
		border-radius: var(--radius-md);
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.status-tab:hover {
		background: var(--bg-secondary);
		color: var(--text-primary);
	}

	.status-tab.active {
		background: var(--accent);
		color: var(--accent-contrast);
	}

	.tab-badge {
		font-size: 0.75rem;
		background: rgba(0, 0, 0, 0.1);
		padding: 0.1rem 0.4rem;
		border-radius: 9999px;
	}

	.status-tab.active .tab-badge {
		background: rgba(255, 255, 255, 0.25);
	}

	.search-form {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.search-input {
		width: 220px;
	}

	.input-sm {
		padding: 0.35rem 0.6rem;
		font-size: 0.85rem;
	}

	.table-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		overflow: hidden;
	}

	.table-wrapper {
		overflow-x: auto;
	}

	.posts-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	.posts-table th {
		text-align: left;
		padding: 0.85rem 1rem;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border-color);
		color: var(--text-muted);
		font-weight: 600;
	}

	.posts-table td {
		padding: 0.9rem 1rem;
		border-bottom: 1px solid var(--border-light);
	}

	.title-cell {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.post-title {
		font-weight: 600;
		color: var(--text-primary);
	}

	.post-title:hover {
		color: var(--accent);
	}

	.post-slug {
		font-size: 0.75rem;
		color: var(--text-muted);
		font-family: var(--font-mono);
	}

	.status-badge {
		display: inline-block;
		padding: 0.15rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: capitalize;
	}

	.status-badge.published {
		background: var(--success-bg);
		color: var(--success);
	}

	.status-badge.draft {
		background: var(--warning-bg);
		color: var(--warning);
	}

	.status-badge.archived {
		background: var(--bg-secondary);
		color: var(--text-muted);
	}

	.status-badge.trash {
		background: var(--danger-bg);
		color: var(--danger);
	}

	.tags-mini {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.tag-pill {
		font-size: 0.75rem;
		background: var(--bg-secondary);
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
		color: var(--text-secondary);
	}

	.empty-cell {
		color: var(--text-muted);
	}

	.actions-header {
		text-align: right;
	}

	.actions-group {
		display: flex;
		justify-content: flex-end;
		gap: 0.4rem;
		align-items: center;
	}

	.trash-btn:hover {
		color: var(--danger);
		border-color: var(--danger);
	}

	.empty-state {
		text-align: center;
		padding: 4rem;
		color: var(--text-muted);
	}
</style>
