<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import {
		ChevronLeft,
		ChevronRight,
		Eye,
		EyeOff,
		FileText,
		PenLine,
		RotateCcw,
		Search,
		Send,
		SquarePen,
		Trash,
		X
	} from '@lucide/svelte';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import StatusBadge from '$lib/components/admin/StatusBadge.svelte';
	import { formatRelative, formatShortDate } from '$lib/format';
	import { actionFeedback } from '$lib/ui/enhance';

	let { data } = $props();

	let query = $derived(data.searchQuery);
	const isAdmin = $derived(data.user.role === 'admin');

	const tabs = [
		{ value: 'all', label: 'Tous' },
		{ value: 'published', label: 'Publiés' },
		{ value: 'draft', label: 'Brouillons' },
		{ value: 'archived', label: 'Archivés' },
		{ value: 'trash', label: 'Corbeille' }
	] as const;

	function href(params: { status?: string; q?: string; p?: number }) {
		const search = new URLSearchParams();
		const status = params.status ?? data.activeStatus;
		const q = params.q ?? data.searchQuery;
		if (status !== 'all') search.set('status', status);
		if (q) search.set('q', q);
		if (params.p && params.p > 1) search.set('p', String(params.p));
		const qs = search.toString();
		return `/admin/posts${qs ? `?${qs}` : ''}`;
	}

	function submitSearch(e: SubmitEvent) {
		e.preventDefault();
		goto(href({ q: query.trim(), p: 1 }), { keepFocus: true, noScroll: true });
	}
</script>

<svelte:head>
	<title>Articles — {data.siteTitle}</title>
</svelte:head>

<div class="admin-page">
	<PageHeader title="Articles" description={isAdmin ? 'Tous les articles du blog.' : 'Vos articles, brouillons et publications.'}>
		{#snippet actions()}
			<a href="/admin/posts/new" class="btn btn-primary"><PenLine size={15} /> Nouvel article</a>
		{/snippet}
	</PageHeader>

	<div class="toolbar">
		<nav class="tabs" aria-label="Filtrer par statut">
			{#each tabs as tab}
				<a
					href={href({ status: tab.value, p: 1 })}
					class="tab"
					class:active={data.activeStatus === tab.value}
					aria-current={data.activeStatus === tab.value ? 'page' : undefined}
					data-sveltekit-noscroll
				>
					{tab.label}
					<span class="count">{data.counts[tab.value]}</span>
				</a>
			{/each}
		</nav>

		<form class="search" onsubmit={submitSearch} role="search">
			<Search size={15} />
			<input type="search" bind:value={query} placeholder="Titre ou slug…" aria-label="Rechercher un article" />
			{#if data.searchQuery}
				<a href={href({ q: '', p: 1 })} aria-label="Effacer" class="clear"><X size={14} /></a>
			{/if}
		</form>
	</div>

	<div class="card table-card">
		{#if data.posts.length}
			<div class="table-scroll">
				<table class="table posts-table">
					<thead>
						<tr>
							<th>Titre</th>
							<th>Statut</th>
							{#if isAdmin}<th>Auteur</th>{/if}
							<th>Modifié</th>
							<th class="actions-col"><span class="sr-only">Actions</span></th>
						</tr>
					</thead>
					<tbody>
						{#each data.posts as post (post.id)}
							<tr>
								<td class="title-cell" data-label="Titre">
									{#if post.status === 'trash'}
										<span class="title">{post.title}</span>
									{:else}
										<a href="/admin/posts/{post.id}/edit" class="title">{post.title}</a>
									{/if}
									<span class="sub">
										/posts/{post.slug}
										{#if post.tags.length}· {post.tags.map((t) => `#${t}`).join(' ')}{/if}
									</span>
								</td>
								<td>
									<StatusBadge status={post.status} />
									{#if post.status === 'published' && post.published_at}
										<span class="sub">{formatShortDate(post.published_at)}</span>
									{/if}
								</td>
								{#if isAdmin}<td class="muted">{post.author_name}</td>{/if}
								<td class="muted nowrap" title={new Date(post.updated_at).toLocaleString('fr-FR')}>{formatRelative(post.updated_at)}</td>
								<td>
									<div class="row-actions">
										{#if post.status === 'trash'}
											<form method="post" action="?/restore" use:enhance={actionFeedback()}>
												<input type="hidden" name="id" value={post.id} />
												<button class="btn btn-ghost btn-sm" title="Restaurer en brouillon"><RotateCcw size={15} /> Restaurer</button>
											</form>
											{#if isAdmin}
												<form
													method="post"
													action="?/deletePermanent"
													use:enhance={actionFeedback({
														title: 'Supprimer définitivement ?',
														message: `« ${post.title} » sera effacé pour toujours. Cette action est irréversible.`,
														confirmLabel: 'Supprimer',
														danger: true
													})}
												>
													<input type="hidden" name="id" value={post.id} />
													<button class="btn btn-danger-ghost btn-sm" title="Supprimer définitivement"><Trash size={15} /> Supprimer</button>
												</form>
											{/if}
										{:else}
											<a href="/admin/posts/{post.id}/edit" class="btn btn-ghost btn-sm btn-icon" title="Modifier" aria-label="Modifier"><SquarePen size={15} /></a>
											<a href="/posts/{post.slug}" class="btn btn-ghost btn-sm btn-icon" title={post.status === 'published' ? 'Voir en ligne' : 'Aperçu'} aria-label="Voir" target="_blank" rel="noopener"><Eye size={15} /></a>
											{#if post.status === 'published'}
												<form method="post" action="?/unpublish" use:enhance={actionFeedback({ title: 'Dépublier cet article ?', message: 'Il redeviendra un brouillon et ne sera plus visible publiquement.', confirmLabel: 'Dépublier' })}>
													<input type="hidden" name="id" value={post.id} />
													<button class="btn btn-ghost btn-sm btn-icon" title="Dépublier" aria-label="Dépublier"><EyeOff size={15} /></button>
												</form>
											{:else}
												<form method="post" action="?/publish" use:enhance={actionFeedback()}>
													<input type="hidden" name="id" value={post.id} />
													<button class="btn btn-ghost btn-sm btn-icon" title="Publier" aria-label="Publier"><Send size={15} /></button>
												</form>
											{/if}
											<form method="post" action="?/trash" use:enhance={actionFeedback()}>
												<input type="hidden" name="id" value={post.id} />
												<button class="btn btn-danger-ghost btn-sm btn-icon" title="Mettre à la corbeille" aria-label="Mettre à la corbeille"><Trash size={15} /></button>
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
				<div class="empty-state-icon"><FileText size={20} /></div>
				{#if data.searchQuery}
					<h3>Aucun résultat</h3>
					<p>Aucun article ne correspond à « {data.searchQuery} ».</p>
				{:else if data.activeStatus === 'trash'}
					<h3>La corbeille est vide</h3>
					<p>Les articles supprimés apparaîtront ici avant leur suppression définitive.</p>
				{:else}
					<h3>Aucun article ici</h3>
					<p>Commencez par rédiger un article : il sera enregistré comme brouillon.</p>
					<a href="/admin/posts/new" class="btn btn-primary btn-sm">Nouvel article</a>
				{/if}
			</div>
		{/if}
	</div>

	{#if data.totalPages > 1}
		<nav class="pagination" aria-label="Pagination">
			<a class="btn btn-secondary btn-sm" class:disabled={data.page <= 1} href={href({ p: data.page - 1 })} aria-disabled={data.page <= 1}><ChevronLeft size={15} /> Précédent</a>
			<span class="muted">Page {data.page} / {data.totalPages} · {data.total} articles</span>
			<a class="btn btn-secondary btn-sm" class:disabled={data.page >= data.totalPages} href={href({ p: data.page + 1 })} aria-disabled={data.page >= data.totalPages}>Suivant <ChevronRight size={15} /></a>
		</nav>
	{/if}
</div>

<style>
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.tabs {
		display: flex;
		gap: 0.15rem;
		padding: 0.2rem;
		border-radius: var(--radius-md);
		background: var(--surface-2);
		overflow-x: auto;
		max-width: 100%;
		scrollbar-width: none;
	}

	.tab {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		height: 2rem;
		padding: 0 0.75rem;
		border-radius: var(--radius-sm);
		font-size: 0.8125rem;
		font-weight: 550;
		color: var(--text-2);
		white-space: nowrap;
	}

	.tab:hover {
		color: var(--text);
	}

	.tab.active {
		background: var(--surface);
		color: var(--text);
		box-shadow: var(--shadow-sm);
	}

	.count {
		font-size: 0.72rem;
		color: var(--text-3);
		font-variant-numeric: tabular-nums;
	}

	.search {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		height: 2.3rem;
		width: min(280px, 100%);
		padding: 0 0.5rem 0 0.75rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		background: var(--surface);
		color: var(--text-3);
	}

	.search:focus-within {
		border-color: var(--accent);
		box-shadow: var(--ring);
	}

	.search input {
		flex: 1;
		min-width: 0;
		border: none;
		outline: none;
		background: none;
		font-size: 0.85rem;
		color: var(--text);
	}

	.search input::-webkit-search-cancel-button {
		display: none;
	}

	.clear {
		display: flex;
		padding: 0.25rem;
		border-radius: 50%;
	}

	.table-scroll {
		overflow-x: auto;
	}

	.title-cell {
		min-width: 240px;
	}

	.title {
		display: block;
		font-weight: 600;
		color: var(--text);
	}

	a.title:hover {
		color: var(--accent);
	}

	.sub {
		display: block;
		margin-top: 0.15rem;
		font-size: 0.75rem;
		color: var(--text-3);
		font-family: var(--font-mono);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 420px;
	}

	td .sub {
		font-family: inherit;
	}

	.title-cell .sub {
		font-family: var(--font-mono);
	}

	.nowrap {
		white-space: nowrap;
	}

	.actions-col {
		width: 1%;
	}

	.row-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.1rem;
	}

	/* Cards instead of a table on small screens */
	@media (max-width: 720px) {
		.posts-table thead {
			display: none;
		}

		.posts-table tbody tr {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.4rem 0.9rem;
			padding: 0.85rem 1rem;
			border-bottom: 1px solid var(--border);
		}

		.posts-table tbody tr:last-child {
			border-bottom: none;
		}

		.posts-table td {
			padding: 0;
			border: none;
		}

		.posts-table .title-cell {
			flex-basis: 100%;
			min-width: 0;
		}

		.posts-table td:not(.title-cell):not(:last-child) {
			display: inline-flex;
			align-items: center;
			gap: 0.5rem;
			font-size: 0.8rem;
		}

		.posts-table td .sub {
			display: none;
		}

		.posts-table .title-cell .sub {
			display: block;
			max-width: 100%;
		}

		.posts-table td:last-child {
			flex-basis: 100%;
		}

		.row-actions {
			justify-content: flex-start;
			margin-left: -0.4rem;
		}

		.table-scroll {
			overflow: visible;
		}
	}

	.pagination {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 1rem;
		font-size: 0.8125rem;
	}

	.pagination .disabled {
		pointer-events: none;
		opacity: 0.45;
	}
</style>
