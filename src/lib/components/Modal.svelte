<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open,
		onclose,
		size = 'md',
		labelledby,
		children
	}: {
		open: boolean;
		onclose: () => void;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		labelledby?: string;
		children: Snippet;
	} = $props();

	let dialog = $state<HTMLDialogElement | null>(null);

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialog}
	class="modal modal-{size}"
	aria-labelledby={labelledby}
	oncancel={(e) => {
		e.preventDefault();
		onclose();
	}}
	onclick={(e) => {
		if (e.target === dialog) onclose();
	}}
>
	{#if open}
		<div class="modal-content">
			{@render children()}
		</div>
	{/if}
</dialog>

<style>
	.modal {
		margin: auto;
		width: calc(100% - 2rem);
		max-height: min(88vh, 860px);
		padding: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius-xl);
		background: var(--surface);
		color: var(--text);
		box-shadow: var(--shadow-lg);
		overflow: hidden;
	}

	.modal[open] {
		display: flex;
		animation: pop 0.18s var(--ease);
	}

	.modal::backdrop {
		background: rgb(12 10 9 / 0.5);
		backdrop-filter: blur(3px);
		animation: fade 0.18s var(--ease);
	}

	.modal-sm {
		max-width: 440px;
	}

	.modal-md {
		max-width: 640px;
	}

	.modal-lg {
		max-width: 860px;
	}

	.modal-xl {
		max-width: 1080px;
	}

	.modal-content {
		display: flex;
		flex-direction: column;
		width: 100%;
		min-height: 0;
	}

	@keyframes pop {
		from {
			opacity: 0;
			transform: translateY(8px) scale(0.98);
		}
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
	}
</style>
