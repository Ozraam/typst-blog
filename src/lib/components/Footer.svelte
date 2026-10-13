<script lang="ts">
	import Logo from './Logo.svelte';

	let {
		siteTitle,
		siteDescription,
		user
	}: { siteTitle: string; siteDescription: string; user: { username: string } | null } = $props();

	const year = new Date().getFullYear();
</script>

<footer class="footer">
	<div class="container footer-inner">
		<div class="about">
			<a href="/" class="brand">
				<Logo size={22} />
				<span>{siteTitle}</span>
			</a>
			{#if siteDescription}<p>{siteDescription}</p>{/if}
		</div>

		<nav class="links" aria-label="Liens de pied de page">
			<a href="/">Articles</a>
			<a href="/rss.xml">Flux RSS</a>
			{#if user}
				<a href="/admin">Administration</a>
			{:else}
				<a href="/login">Connexion</a>
			{/if}
		</nav>
	</div>
	<div class="container legal">
		<span>© {year} {siteTitle}</span>
		<span>Composé avec <a href="https://typst.app" target="_blank" rel="noopener noreferrer">Typst</a></span>
	</div>
</footer>

<style>
	.footer {
		margin-top: 5rem;
		border-top: 1px solid var(--border);
		background: var(--surface);
		font-size: 0.875rem;
		color: var(--text-2);
	}

	.footer-inner {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 2rem;
		padding-block: 2.5rem 1.75rem;
	}

	.about {
		max-width: 28rem;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		font-family: var(--font-serif);
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text);
		margin-bottom: 0.5rem;
	}

	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 1.5rem;
		align-items: flex-start;
	}

	.links a:hover,
	.legal a:hover {
		color: var(--accent);
	}

	.legal {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.5rem;
		padding-block: 1.1rem 1.5rem;
		border-top: 1px solid var(--border);
		font-size: 0.8rem;
		color: var(--text-3);
	}

	.legal a {
		color: var(--text-2);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
</style>
