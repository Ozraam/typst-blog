<script lang="ts">
	import { onMount } from 'svelte';
	import { Moon, Sun } from '@lucide/svelte';
	import { theme } from '$lib/ui/theme.svelte';

	let { class: className = 'btn btn-ghost btn-icon' }: { class?: string } = $props();

	onMount(() => theme.sync());
</script>

<!-- Both icons are rendered: CSS shows the right one before hydration (no flash) -->
<button type="button" class="theme-toggle {className}" onclick={() => theme.toggle()} aria-label="Changer de thème" title="Changer de thème">
	<Sun size={18} class="icon-sun" />
	<Moon size={18} class="icon-moon" />
</button>

<style>
	.theme-toggle :global(.icon-sun) {
		display: none;
	}

	:global(:root[data-theme='dark']) .theme-toggle :global(.icon-sun) {
		display: block;
	}

	:global(:root[data-theme='dark']) .theme-toggle :global(.icon-moon) {
		display: none;
	}
</style>
