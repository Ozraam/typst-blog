<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let { data, children } = $props<{
		data: {
			user: { id: string; username: string; role: string } | null;
			siteTitle: string;
			siteDescription: string;
		};
		children: any;
	}>();

	const isAdminRoute = $derived(page.url.pathname.startsWith('/admin'));
</script>

<div class="app-container {isAdminRoute ? 'is-admin' : ''}">
	{#if !isAdminRoute}
		<Header siteTitle={data.siteTitle} user={data.user} />
	{/if}

	<main class="main-content">
		{@render children()}
	</main>

	{#if !isAdminRoute}
		<Footer siteTitle={data.siteTitle} />
	{/if}
</div>

<style>
	.app-container {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.app-container.is-admin .main-content {
		padding: 0;
	}
</style>
