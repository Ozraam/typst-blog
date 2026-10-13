<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { LayoutDashboard, Rss, Search, X } from '@lucide/svelte';
	import Logo from './Logo.svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	let {
		siteTitle,
		user
	}: {
		siteTitle: string;
		user: { username: string; role: string } | null;
	} = $props();

	let scrolled = $state(false);
	let searchOpen = $state(false);
	let query = $state('');
	let searchInput = $state<HTMLInputElement | null>(null);

	async function openSearch() {
		query = page.url.searchParams.get('q') ?? '';
		searchOpen = true;
		await Promise.resolve();
		searchInput?.focus();
	}

	function submitSearch(e: SubmitEvent) {
		e.preventDefault();
		searchOpen = false;
		goto(query.trim() ? `/?q=${encodeURIComponent(query.trim())}` : '/');
	}
</script>

<svelte:window onscroll={() => (scrolled = window.scrollY > 8)} />

<header class="header" class:scrolled>
	<div class="container header-inner">
		<a href="/" class="brand" aria-label="{siteTitle}, accueil">
			<Logo size={28} />
			<span class="brand-title">{siteTitle}</span>
		</a>

		<nav class="actions" aria-label="Navigation principale">
			{#if searchOpen}
				<form class="search" onsubmit={submitSearch} role="search">
					<Search size={16} />
					<input
						bind:this={searchInput}
						bind:value={query}
						type="search"
						placeholder="Rechercher un article…"
						aria-label="Rechercher un article"
						onkeydown={(e) => e.key === 'Escape' && (searchOpen = false)}
					/>
					<button type="button" class="close" onclick={() => (searchOpen = false)} aria-label="Fermer la recherche">
						<X size={16} />
					</button>
				</form>
			{:else}
				<button type="button" class="btn btn-ghost btn-icon" onclick={openSearch} aria-label="Rechercher" title="Rechercher">
					<Search size={18} />
				</button>
			{/if}

			<a href="/rss.xml" class="btn btn-ghost btn-icon hide-sm" aria-label="Flux RSS" title="Flux RSS">
				<Rss size={18} />
			</a>
			<ThemeToggle />

			{#if user}
				<a href="/admin" class="btn btn-secondary btn-sm dashboard-link">
					<LayoutDashboard size={15} />
					<span class="hide-sm">Tableau de bord</span>
				</a>
			{/if}
		</nav>
	</div>
</header>

<style>
	.header {
		position: sticky;
		top: 0;
		z-index: 50;
		height: var(--header-h);
		background: color-mix(in srgb, var(--bg) 82%, transparent);
		backdrop-filter: saturate(1.6) blur(14px);
		-webkit-backdrop-filter: saturate(1.6) blur(14px);
		border-bottom: 1px solid transparent;
		transition: border-color 0.2s var(--ease);
	}

	.header.scrolled {
		border-bottom-color: var(--border);
	}

	.header-inner {
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		min-width: 0;
	}

	.brand-title {
		font-family: var(--font-serif);
		font-size: 1.3rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 0.15rem;
	}

	.dashboard-link {
		margin-left: 0.5rem;
	}

	.search {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		height: 2.25rem;
		padding: 0 0.35rem 0 0.7rem;
		border: 1px solid var(--accent);
		box-shadow: var(--ring);
		border-radius: 999px;
		background: var(--surface);
		color: var(--text-3);
		width: min(300px, 52vw);
	}

	.search input {
		flex: 1;
		min-width: 0;
		border: none;
		outline: none;
		background: none;
		font-size: 0.875rem;
		color: var(--text);
	}

	.search input::-webkit-search-cancel-button {
		display: none;
	}

	.close {
		display: flex;
		padding: 0.3rem;
		border-radius: 50%;
		color: var(--text-3);
	}

	.close:hover {
		background: var(--surface-2);
		color: var(--text);
	}

	@media (max-width: 640px) {
		.hide-sm {
			display: none;
		}

		.dashboard-link {
			width: 1.9rem;
			padding: 0;
		}
	}
</style>
