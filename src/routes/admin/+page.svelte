<script lang="ts">
	import {
		ArrowRight,
		ExternalLink,
		FilePen,
		FileText,
		Images,
		Inbox,
		PenLine,
		Settings,
		Sparkles,
		Users
	} from '@lucide/svelte';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import StatusBadge from '$lib/components/admin/StatusBadge.svelte';
	import { formatRelative } from '$lib/format';

	let { data } = $props();

	const hour = new Date().getHours();
	const greeting = hour < 5 || hour >= 18 ? 'Bonsoir' : 'Bonjour';

	const stats = $derived([
		{ label: 'Articles publiés', value: data.counts.published, icon: FileText, href: '/admin/posts?status=published' },
		{ label: 'Brouillons', value: data.counts.draft, icon: FilePen, href: '/admin/posts?status=draft' },
		{ label: 'Fichiers médias', value: data.mediaCount, icon: Images, href: '/admin/media' },
		data.user.role === 'admin'
			? { label: 'Utilisateurs', value: data.usersCount, icon: Users, href: '/admin/users' }
			: { label: 'Corbeille', value: data.counts.trash, icon: Inbox, href: '/admin/posts?status=trash' }
	]);
</script>

<svelte:head>
	<title>Tableau de bord — {data.siteTitle}</title>
</svelte:head>

<div class="admin-page">
	<PageHeader title="{greeting}, {data.user.username}" description="Voici l'état de votre blog.">
		{#snippet actions()}
			<a href="/" target="_blank" rel="noopener" class="btn btn-secondary"><ExternalLink size={15} /> Voir le blog</a>
			<a href="/admin/posts/new" class="btn btn-primary"><PenLine size={15} /> Écrire</a>
		{/snippet}
	</PageHeader>

	{#if data.welcome}
		<section class="card welcome">
			<div class="welcome-icon"><Sparkles size={20} /></div>
			<div>
				<h2>Votre blog est prêt</h2>
				<p>Quelques étapes pour bien démarrer :</p>
				<ol>
					<li><a href="/admin/settings">Donnez un titre et une description à votre blog</a></li>
					<li><a href="/admin/posts/new">Rédigez votre premier article en Typst</a></li>
					<li><a href="/admin/media">Importez vos images dans la médiathèque</a></li>
				</ol>
			</div>
		</section>
	{/if}

	<section class="stats">
		{#each stats as stat}
			<a href={stat.href} class="card stat">
				<span class="stat-icon"><stat.icon size={18} /></span>
				<span class="stat-value">{stat.value.toLocaleString('fr-FR')}</span>
				<span class="stat-label">{stat.label}</span>
			</a>
		{/each}
	</section>

	<div class="grid">
		<section class="card recent">
			<header class="section-header">
				<h2>Activité récente</h2>
				<a href="/admin/posts" class="btn btn-ghost btn-sm">Tous les articles <ArrowRight size={14} /></a>
			</header>

			{#if data.recentPosts.length}
				<ul class="recent-list">
					{#each data.recentPosts as post}
						<li>
							<a href="/admin/posts/{post.id}/edit" class="recent-item">
								<span class="recent-title">{post.title}</span>
								<span class="recent-meta">
									<StatusBadge status={post.status} />
									<span class="muted">modifié {formatRelative(post.updated_at)}</span>
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<div class="empty-state">
					<div class="empty-state-icon"><PenLine size={20} /></div>
					<h3>Aucun article</h3>
					<p>Commencez par rédiger votre premier article.</p>
					<a href="/admin/posts/new" class="btn btn-primary btn-sm">Nouvel article</a>
				</div>
			{/if}
		</section>

		<section class="card shortcuts">
			<h2>Raccourcis</h2>
			<a href="/admin/posts/new" class="shortcut"><PenLine size={16} /> Nouvel article</a>
			<a href="/admin/media" class="shortcut"><Images size={16} /> Importer des médias</a>
			{#if data.user.role === 'admin'}
				<a href="/admin/settings" class="shortcut"><Settings size={16} /> Paramètres du blog</a>
			{/if}
			<div class="tip">
				<p class="tip-title">Astuce</p>
				<p>Dans l'éditeur, <span class="kbd">Ctrl</span> + <span class="kbd">S</span> enregistre l'article sans quitter la page.</p>
			</div>
		</section>
	</div>
</div>

<style>
	.welcome {
		display: flex;
		gap: 1rem;
		padding: 1.25rem 1.4rem;
		margin-bottom: 1.5rem;
		background:
			radial-gradient(100% 140% at 100% 0%, var(--accent-soft) 0%, transparent 60%),
			var(--surface);
	}

	.welcome-icon {
		flex-shrink: 0;
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: var(--radius-md);
		background: var(--accent);
		color: var(--on-accent);
	}

	.welcome h2 {
		font-size: 1.05rem;
	}

	.welcome p {
		color: var(--text-2);
		font-size: 0.875rem;
		margin: 0.2rem 0 0.5rem;
	}

	.welcome ol {
		padding-left: 1.1rem;
		font-size: 0.875rem;
		display: grid;
		gap: 0.2rem;
	}

	.welcome a {
		color: var(--accent);
		font-weight: 550;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.stat {
		display: grid;
		grid-template-columns: 1fr auto;
		grid-template-areas:
			'value icon'
			'label label';
		gap: 0.15rem;
		padding: 1.1rem 1.2rem;
		transition:
			border-color 0.15s var(--ease),
			box-shadow 0.15s var(--ease);
	}

	.stat:hover {
		border-color: var(--border-strong);
		box-shadow: var(--shadow-md);
	}

	.stat-icon {
		grid-area: icon;
		display: grid;
		place-items: center;
		width: 2.1rem;
		height: 2.1rem;
		border-radius: var(--radius-sm);
		background: var(--surface-2);
		color: var(--text-2);
	}

	.stat-value {
		grid-area: value;
		font-size: 1.85rem;
		font-weight: 650;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
	}

	.stat-label {
		grid-area: label;
		font-size: 0.8125rem;
		color: var(--text-2);
	}

	.grid {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
		gap: 1rem;
		align-items: start;
	}

	@media (max-width: 960px) {
		.grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.2rem 0.6rem;
	}

	h2 {
		font-size: 0.95rem;
	}

	.recent-list {
		list-style: none;
		padding: 0 0.5rem 0.5rem;
	}

	.recent-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.7rem 0.7rem;
		border-radius: var(--radius-sm);
	}

	.recent-item:hover {
		background: var(--surface-2);
	}

	.recent-title {
		font-weight: 550;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.recent-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-shrink: 0;
		font-size: 0.8rem;
	}

	@media (max-width: 560px) {
		.recent-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.35rem;
		}
	}

	.shortcuts {
		display: flex;
		flex-direction: column;
		padding: 1rem 0.7rem 0.8rem;
	}

	.shortcuts h2 {
		padding: 0 0.5rem 0.5rem;
	}

	.shortcut {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.6rem 0.5rem;
		border-radius: var(--radius-sm);
		font-size: 0.875rem;
		color: var(--text-2);
	}

	.shortcut:hover {
		background: var(--surface-2);
		color: var(--text);
	}

	.tip {
		margin: 0.75rem 0.5rem 0.2rem;
		padding: 0.8rem;
		border-radius: var(--radius-sm);
		background: var(--surface-2);
		font-size: 0.8125rem;
		color: var(--text-2);
	}

	.tip-title {
		font-weight: 650;
		color: var(--text);
		margin-bottom: 0.2rem;
	}
</style>
