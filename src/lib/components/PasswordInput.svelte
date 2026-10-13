<script lang="ts">
	import { Eye, EyeOff } from '@lucide/svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';

	let { ...rest }: HTMLInputAttributes = $props();
	let visible = $state(false);
</script>

<div class="password input-group">
	<input {...rest} type={visible ? 'text' : 'password'} class="input" />
	<button
		type="button"
		class="toggle"
		onclick={() => (visible = !visible)}
		aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
		tabindex="-1"
	>
		{#if visible}<EyeOff size={16} />{:else}<Eye size={16} />{/if}
	</button>
</div>

<style>
	.toggle {
		display: grid;
		place-items: center;
		padding: 0 0.75rem;
		color: var(--text-3);
	}

	.toggle:hover {
		color: var(--text);
	}
</style>
