<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, description, actions }: { title: string; description?: string; actions?: Snippet } = $props();
</script>

<header class="page-header">
	<div>
		<h1>{title}</h1>
		{#if description}<p>{description}</p>{/if}
	</div>
	{#if actions}
		<div class="actions">{@render actions()}</div>
	{/if}
</header>

<style>
	.page-header {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.75rem;
	}

	h1 {
		font-size: 1.6rem;
		font-weight: 650;
		letter-spacing: -0.02em;
	}

	p {
		margin-top: 0.3rem;
		color: var(--text-2);
		font-size: 0.9rem;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}
</style>
