<script lang="ts">
	let { siteTitle = 'Typst Blog' } = $props<{ siteTitle?: string }>();
	const currentYear = new Date().getFullYear();
</script>

<footer class="footer">
	<div class="footer-inner">
		<div class="copy">
			<p>© {currentYear} {siteTitle} — Rédigé et compilé avec <a href="https://typst.app" target="_blank" rel="noopener">Typst</a> & <a href="https://svelte.dev" target="_blank" rel="noopener">SvelteKit</a>.</p>
		</div>
		<div class="links">
			<a href="/rss.xml">Flux RSS</a>
			<span>·</span>
			<a href="/login">Administration</a>
		</div>
	</div>
</footer>

<style>
	.footer {
		margin-top: auto;
		border-top: 1px solid var(--border-color);
		background-color: var(--bg-card);
		color: var(--text-muted);
		font-size: 0.85rem;
		padding: 2rem 1.5rem;
	}

	.footer-inner {
		max-width: 1100px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		text-align: center;
	}

	@media (min-width: 640px) {
		.footer-inner {
			flex-direction: row;
			text-align: left;
		}
	}

	.links {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.links a {
		color: var(--text-secondary);
	}

	.links a:hover {
		color: var(--accent);
	}
</style>
