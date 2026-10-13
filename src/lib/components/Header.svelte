<script lang="ts">
	import { onMount } from 'svelte';

	let { siteTitle = 'Typst Blog', user = null } = $props<{
		siteTitle?: string;
		user?: { id: string; username: string; role: string } | null;
	}>();

	let theme = $state('light');

	onMount(() => {
		const savedTheme = localStorage.getItem('theme');
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		theme = savedTheme || (prefersDark ? 'dark' : 'light');
		document.documentElement.setAttribute('data-theme', theme);
	});

	function toggleTheme() {
		theme = theme === 'light' ? 'dark' : 'light';
		document.documentElement.setAttribute('data-theme', theme);
		localStorage.setItem('theme', theme);
	}
</script>

<header class="header">
	<div class="header-inner">
		<div class="brand">
			<a href="/" class="brand-link">
				<span class="brand-icon">📄</span>
				<span class="brand-title">{siteTitle}</span>
			</a>
		</div>

		<nav class="nav">
			<a href="/" class="nav-link">Accueil</a>
			<a href="/rss.xml" class="nav-link rss-link" title="Flux RSS" target="_blank" rel="noopener">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M4 11a9 9 0 0 1 9 9" />
					<path d="M4 4a16 16 0 0 1 16 16" />
					<circle cx="5" cy="19" r="1" />
				</svg>
				<span>RSS</span>
			</a>

			<button type="button" class="theme-btn" onclick={toggleTheme} aria-label="Changer de thème">
				{#if theme === 'dark'}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="5" />
						<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
					</svg>
				{:else}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
					</svg>
				{/if}
			</button>

			{#if user}
				<a href="/admin" class="btn btn-primary btn-sm">
					<span>Admin</span>
					<span class="user-pill">{user.username}</span>
				</a>
			{:else}
				<a href="/login" class="nav-link login-link" title="Connexion">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
						<polyline points="10 17 15 12 10 7" />
						<line x1="15" y1="12" x2="3" y2="12" />
					</svg>
				</a>
			{/if}
		</nav>
	</div>
</header>

<style>
	.header {
		border-bottom: 1px solid var(--border-color);
		background-color: var(--bg-card);
		position: sticky;
		top: 0;
		z-index: 50;
		backdrop-filter: blur(8px);
	}

	.header-inner {
		max-width: 1100px;
		margin: 0 auto;
		padding: 0.8rem 1.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.brand-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-primary);
		font-weight: 700;
		font-size: 1.2rem;
		letter-spacing: -0.01em;
	}

	.brand-link:hover {
		color: var(--accent);
	}

	.nav {
		display: flex;
		align-items: center;
		gap: 1.25rem;
	}

	.nav-link {
		color: var(--text-secondary);
		font-size: 0.9rem;
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.nav-link:hover {
		color: var(--accent);
	}

	.theme-btn {
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.4rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-color);
		background: var(--bg-secondary);
	}

	.theme-btn:hover {
		color: var(--accent);
		border-color: var(--accent);
	}

	.user-pill {
		font-size: 0.75rem;
		opacity: 0.85;
		background: rgba(255, 255, 255, 0.2);
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
	}
</style>
