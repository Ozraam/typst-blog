<script lang="ts">
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import {
		ExternalLink,
		Files,
		Images,
		LayoutDashboard,
		LogOut,
		Menu,
		Plus,
		Settings,
		UserRound,
		Users,
		X
	} from '@lucide/svelte';
	import Logo from '$lib/components/Logo.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { initials, ROLE_LABELS } from '$lib/format';

	let { data, children } = $props();

	let menuOpen = $state(false);
	afterNavigate(() => (menuOpen = false));

	const path = $derived(page.url.pathname);
	// The editor takes the whole screen
	const focusMode = $derived(/^\/admin\/posts\/(new|[^/]+\/edit)$/.test(path));

	const nav = $derived([
		{ href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, active: path === '/admin' },
		{ href: '/admin/posts', label: 'Articles', icon: Files, active: path === '/admin/posts' },
		{ href: '/admin/media', label: 'Médiathèque', icon: Images, active: path.startsWith('/admin/media') }
	]);

	const adminNav = $derived([
		{ href: '/admin/users', label: 'Utilisateurs', icon: Users, active: path.startsWith('/admin/users') },
		{ href: '/admin/settings', label: 'Paramètres', icon: Settings, active: path.startsWith('/admin/settings') }
	]);
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if focusMode}
	{@render children()}
{:else}
	<div class="shell">
		<header class="mobile-bar">
			<button type="button" class="btn btn-ghost btn-icon" onclick={() => (menuOpen = true)} aria-label="Ouvrir le menu">
				<Menu size={20} />
			</button>
			<a href="/admin" class="mobile-brand"><Logo size={24} /> Studio</a>
			<a href="/admin/posts/new" class="btn btn-primary btn-sm btn-icon" aria-label="Nouvel article"><Plus size={16} /></a>
		</header>

		{#if menuOpen}
			<button type="button" class="backdrop" aria-label="Fermer le menu" onclick={() => (menuOpen = false)}></button>
		{/if}

		<aside class="sidebar" class:open={menuOpen}>
			<div class="sidebar-top">
				<a href="/admin" class="brand">
					<Logo size={28} />
					<span>
						<strong>{data.siteTitle}</strong>
						<small>Studio</small>
					</span>
				</a>
				<button type="button" class="btn btn-ghost btn-icon close" onclick={() => (menuOpen = false)} aria-label="Fermer le menu">
					<X size={18} />
				</button>
			</div>

			<a href="/admin/posts/new" class="btn btn-primary btn-block new-post"><Plus size={16} /> Nouvel article</a>

			<nav class="nav" aria-label="Administration">
				{#each nav as item}
					<a href={item.href} class="nav-link" class:active={item.active} aria-current={item.active ? 'page' : undefined}>
						<item.icon size={17} />
						{item.label}
					</a>
				{/each}

				{#if data.user.role === 'admin'}
					<p class="nav-section">Administration</p>
					{#each adminNav as item}
						<a href={item.href} class="nav-link" class:active={item.active} aria-current={item.active ? 'page' : undefined}>
							<item.icon size={17} />
							{item.label}
						</a>
					{/each}
				{/if}
			</nav>

			<div class="sidebar-bottom">
				<a href="/" class="nav-link" target="_blank" rel="noopener">
					<ExternalLink size={17} /> Voir le blog
				</a>

				<div class="user">
					<a href="/admin/profile" class="user-link" class:active={path.startsWith('/admin/profile')} title="Mon profil">
						<span class="avatar">{initials(data.user.username)}</span>
						<span class="user-text">
							<strong>{data.user.username}</strong>
							<small>{ROLE_LABELS[data.user.role]}</small>
						</span>
					</a>
					<ThemeToggle class="btn btn-ghost btn-icon btn-sm" />
					<form method="post" action="/logout">
						<button type="submit" class="btn btn-ghost btn-icon btn-sm" title="Se déconnecter" aria-label="Se déconnecter">
							<LogOut size={16} />
						</button>
					</form>
				</div>
			</div>
		</aside>

		<main class="content">
			{@render children()}
		</main>
	</div>
{/if}

<style>
	.shell {
		min-height: 100vh;
		display: grid;
		grid-template-columns: 260px minmax(0, 1fr);
	}

	.sidebar {
		position: sticky;
		top: 0;
		height: 100vh;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem 0.85rem;
		background: var(--surface);
		border-right: 1px solid var(--border);
		overflow-y: auto;
	}

	.sidebar-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.25rem 0.35rem;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		min-width: 0;
	}

	.brand span {
		display: flex;
		flex-direction: column;
		min-width: 0;
		line-height: 1.2;
	}

	.brand strong {
		font-size: 0.9rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.brand small {
		font-size: 0.72rem;
		color: var(--text-3);
	}

	.close {
		display: none;
	}

	.nav {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		flex: 1;
	}

	.nav-section {
		margin: 1.1rem 0 0.35rem;
		padding: 0 0.7rem;
		font-size: 0.7rem;
		font-weight: 650;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-3);
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		height: 2.25rem;
		padding: 0 0.7rem;
		border-radius: var(--radius-sm);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-2);
		transition:
			background-color 0.12s var(--ease),
			color 0.12s var(--ease);
	}

	.nav-link:hover {
		background: var(--surface-2);
		color: var(--text);
	}

	.nav-link.active {
		background: var(--accent-soft);
		color: var(--accent);
		font-weight: 600;
	}

	.sidebar-bottom {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--border);
	}

	.user {
		display: flex;
		align-items: center;
		gap: 0.15rem;
	}

	.user-link {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.4rem;
		border-radius: var(--radius-sm);
	}

	.user-link:hover,
	.user-link.active {
		background: var(--surface-2);
	}

	.avatar {
		flex-shrink: 0;
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		background: var(--accent-soft-2);
		color: var(--accent);
		font-size: 0.8rem;
		font-weight: 650;
	}

	.user-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
		line-height: 1.25;
	}

	.user-text strong {
		font-size: 0.8125rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.user-text small {
		font-size: 0.72rem;
		color: var(--text-3);
	}

	.content {
		min-width: 0;
	}

	.mobile-bar,
	.backdrop {
		display: none;
	}

	@media (max-width: 900px) {
		.shell {
			grid-template-columns: minmax(0, 1fr);
			align-content: start;
		}

		.mobile-bar {
			position: sticky;
			top: 0;
			z-index: 40;
			display: flex;
			align-items: center;
			justify-content: space-between;
			height: 3.5rem;
			padding: 0 0.75rem;
			background: color-mix(in srgb, var(--surface) 88%, transparent);
			backdrop-filter: blur(12px);
			border-bottom: 1px solid var(--border);
		}

		.mobile-brand {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			font-weight: 650;
		}

		.sidebar {
			position: fixed;
			z-index: 60;
			left: 0;
			top: 0;
			width: min(290px, 85vw);
			transform: translateX(-100%);
			transition: transform 0.22s var(--ease);
			box-shadow: var(--shadow-lg);
		}

		.sidebar.open {
			transform: none;
		}

		.close {
			display: inline-flex;
		}

		.backdrop {
			display: block;
			position: fixed;
			inset: 0;
			z-index: 55;
			background: rgb(12 10 9 / 0.45);
		}
	}
</style>
