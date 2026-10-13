<script lang="ts">
	let { data } = $props<{
		data: {
			recentPosts: any[];
			counts: Record<string, number>;
			mediaCount: number;
			usersCount: number;
		};
	}>();

	function formatDate(timestamp: number): string {
		return new Intl.DateTimeFormat('fr-FR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		}).format(new Date(timestamp));
	}
</script>

<svelte:head>
	<title>Tableau de bord — Typst Studio</title>
</svelte:head>

<div class="dashboard-page">
	<header class="page-header">
		<div>
			<h1 class="page-title">Tableau de bord</h1>
			<p class="page-subtitle">Vue d'ensemble et gestion de votre plateforme Typst</p>
		</div>
		<a href="/admin/posts/new" class="btn btn-primary">
			<span>✍️ Rédiger un article</span>
		</a>
	</header>

	<!-- Stat Cards -->
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-icon">📄</div>
			<div class="stat-info">
				<span class="stat-value">{data.counts.published || 0}</span>
				<span class="stat-label">Articles publiés</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon">✏️</div>
			<div class="stat-info">
				<span class="stat-value">{data.counts.draft || 0}</span>
				<span class="stat-label">Brouillons en cours</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon">🖼️</div>
			<div class="stat-info">
				<span class="stat-value">{data.mediaCount || 0}</span>
				<span class="stat-label">Fichiers médias</span>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon">🗑️</div>
			<div class="stat-info">
				<span class="stat-value">{data.counts.trash || 0}</span>
				<span class="stat-label">Corbeille</span>
			</div>
		</div>
	</div>

	<!-- Recent Posts Section -->
	<section class="recent-posts-section">
		<div class="section-header">
			<h2>Articles récents</h2>
			<a href="/admin/posts" class="btn btn-secondary btn-sm">Tous les articles →</a>
		</div>

		{#if data.recentPosts.length > 0}
			<div class="table-wrapper">
				<table class="posts-table">
					<thead>
						<tr>
							<th>Titre</th>
							<th>Statut</th>
							<th>Auteur</th>
							<th>Dernière mise à jour</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each data.recentPosts as post}
							<tr>
								<td>
									<a href="/admin/posts/{post.id}/edit" class="post-title-link">
										{post.title}
									</a>
								</td>
								<td>
									<span class="status-pill {post.status}">{post.status}</span>
								</td>
								<td>{post.author_name}</td>
								<td>{formatDate(post.updated_at)}</td>
								<td>
									<div class="actions-cell">
										<a href="/admin/posts/{post.id}/edit" class="btn btn-secondary btn-sm">
											Éditer
										</a>
										{#if post.status === 'published'}
											<a href="/posts/{post.slug}" target="_blank" class="btn btn-secondary btn-sm">
												Voir
											</a>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="empty-box">
				<p>Aucun article pour le moment.</p>
				<a href="/admin/posts/new" class="btn btn-primary btn-sm" style="margin-top: 0.5rem;">
					Créer votre premier article Typst
				</a>
			</div>
		{/if}
	</section>
</div>

<style>
	.dashboard-page {
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

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1.25rem;
	}

	.stat-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1.25rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		box-shadow: var(--shadow-sm);
	}

	.stat-icon {
		font-size: 2rem;
		background: var(--bg-secondary);
		padding: 0.6rem;
		border-radius: var(--radius-md);
	}

	.stat-info {
		display: flex;
		flex-direction: column;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.stat-label {
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.recent-posts-section {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.section-header h2 {
		font-size: 1.2rem;
		font-weight: 600;
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
		padding: 0.75rem 1rem;
		border-bottom: 2px solid var(--border-color);
		color: var(--text-muted);
		font-weight: 600;
	}

	.posts-table td {
		padding: 0.85rem 1rem;
		border-bottom: 1px solid var(--border-light);
	}

	.post-title-link {
		font-weight: 600;
		color: var(--text-primary);
	}

	.post-title-link:hover {
		color: var(--accent);
	}

	.status-pill {
		display: inline-block;
		padding: 0.15rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: capitalize;
	}

	.status-pill.published {
		background: var(--success-bg);
		color: var(--success);
	}

	.status-pill.draft {
		background: var(--warning-bg);
		color: var(--warning);
	}

	.status-pill.trash {
		background: var(--danger-bg);
		color: var(--danger);
	}

	.actions-cell {
		display: flex;
		gap: 0.4rem;
	}

	.empty-box {
		text-align: center;
		padding: 3rem;
		color: var(--text-muted);
	}
</style>
