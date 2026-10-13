<script lang="ts">
	import { page } from '$app/state';

	let { data, children } = $props<{
		data: { user: { username: string; email: string; role: string } };
		children: any;
	}>();

	const pathname = $derived(page.url.pathname);
</script>

<div class="admin-shell">
	<!-- Sidebar -->
	<aside class="admin-sidebar">
		<div class="sidebar-header">
			<a href="/admin" class="sidebar-brand">
				<span class="brand-icon">⚡</span>
				<span class="brand-text">Typst Studio</span>
			</a>
		</div>

		<nav class="sidebar-nav">
			<div class="nav-section-title">Gestion</div>
			<a href="/admin" class="sidebar-link {pathname === '/admin' ? 'active' : ''}">
				<span class="icon">📊</span>
				<span>Tableau de bord</span>
			</a>
			<a href="/admin/posts" class="sidebar-link {pathname.startsWith('/admin/posts') && pathname !== '/admin/posts/new' ? 'active' : ''}">
				<span class="icon">📑</span>
				<span>Articles</span>
			</a>
			<a href="/admin/posts/new" class="sidebar-link {pathname === '/admin/posts/new' ? 'active' : ''}">
				<span class="icon">✍️</span>
				<span>Rédiger un article</span>
			</a>
			<a href="/admin/media" class="sidebar-link {pathname === '/admin/media' ? 'active' : ''}">
				<span class="icon">🖼️</span>
				<span>Médiathèque</span>
			</a>

			{#if data.user.role === 'admin'}
				<div class="nav-section-title">Système</div>
				<a href="/admin/settings" class="sidebar-link {pathname === '/admin/settings' ? 'active' : ''}">
					<span class="icon">⚙️</span>
					<span>Paramètres</span>
				</a>
			{/if}
		</nav>

		<div class="sidebar-footer">
			<div class="user-info">
				<span class="username">{data.user.username}</span>
				<span class="user-role">{data.user.role}</span>
			</div>
			<div class="sidebar-actions">
				<a href="/" class="btn-icon" title="Voir le blog public" target="_blank" rel="noopener">
					🌐
				</a>
				<a href="/logout" class="btn-icon" title="Se déconnecter">
					🚪
				</a>
			</div>
		</div>
	</aside>

	<!-- Main admin content -->
	<div class="admin-body">
		{@render children()}
	</div>
</div>

<style>
	.admin-shell {
		display: flex;
		min-height: 100vh;
		background: var(--bg-primary);
	}

	.admin-sidebar {
		width: 240px;
		background: var(--bg-card);
		border-right: 1px solid var(--border-color);
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
	}

	.sidebar-header {
		padding: 1.25rem;
		border-bottom: 1px solid var(--border-color);
	}

	.sidebar-brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 700;
		font-size: 1.1rem;
		color: var(--text-primary);
	}

	.sidebar-nav {
		padding: 1rem 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
	}

	.nav-section-title {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		padding: 0.75rem 0.5rem 0.25rem;
		font-weight: 600;
	}

	.sidebar-link {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.55rem 0.75rem;
		border-radius: var(--radius-md);
		color: var(--text-secondary);
		font-size: 0.9rem;
		font-weight: 500;
		transition: all 0.15s ease;
	}

	.sidebar-link:hover {
		background: var(--bg-secondary);
		color: var(--text-primary);
	}

	.sidebar-link.active {
		background: var(--accent-light);
		color: var(--accent);
		font-weight: 600;
	}

	.icon {
		font-size: 1rem;
	}

	.sidebar-footer {
		padding: 1rem;
		border-top: 1px solid var(--border-color);
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: var(--bg-secondary);
	}

	.user-info {
		display: flex;
		flex-direction: column;
	}

	.username {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.user-role {
		font-size: 0.75rem;
		color: var(--text-muted);
		text-transform: capitalize;
	}

	.sidebar-actions {
		display: flex;
		gap: 0.3rem;
	}

	.btn-icon {
		padding: 0.3rem;
		border-radius: var(--radius-sm);
		font-size: 1rem;
		color: var(--text-secondary);
	}

	.btn-icon:hover {
		background: var(--bg-card);
	}

	.admin-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
</style>
