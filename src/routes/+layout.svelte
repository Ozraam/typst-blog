<script lang="ts">
	import '@fontsource-variable/inter';
	import '@fontsource-variable/newsreader';
	import '@fontsource-variable/jetbrains-mono';
	import '../app.css';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Toaster from '$lib/components/Toaster.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

	let { data, children } = $props();

	// Admin and authentication screens have their own chrome
	const bare = $derived(/^\/(admin|login|register)(\/|$)/.test(page.url.pathname));
</script>

<svelte:head>
	<link rel="alternate" type="application/rss+xml" title={data.siteTitle} href="/rss.xml" />
</svelte:head>

{#if bare}
	{@render children()}
{:else}
	<div class="site">
		<a class="skip-link" href="#contenu">Aller au contenu</a>
		<Header siteTitle={data.siteTitle} user={data.user} />
		<main id="contenu" class="site-main">
			{@render children()}
		</main>
		<Footer siteTitle={data.siteTitle} siteDescription={data.siteDescription} user={data.user} />
	</div>
{/if}

<Toaster />
<ConfirmDialog />

<style>
	.site {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.site-main {
		flex: 1;
	}

	.skip-link {
		position: absolute;
		left: 1rem;
		top: -3rem;
		z-index: 100;
		padding: 0.5rem 0.8rem;
		border-radius: var(--radius-sm);
		background: var(--accent);
		color: var(--on-accent);
		font-weight: 600;
	}

	.skip-link:focus {
		top: 0.75rem;
	}
</style>
