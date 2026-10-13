<script lang="ts">
	import { fly } from 'svelte/transition';
	import { CircleCheck, CircleAlert, Info, X } from '@lucide/svelte';
	import { toast } from '$lib/ui/toast.svelte';
</script>

<div class="toaster" role="region" aria-label="Notifications" aria-live="polite">
	{#each toast.items as item (item.id)}
		<div class="toast toast-{item.kind}" in:fly={{ y: 12, duration: 180 }} out:fly={{ x: 24, duration: 160 }}>
			<span class="icon">
				{#if item.kind === 'success'}
					<CircleCheck size={18} />
				{:else if item.kind === 'error'}
					<CircleAlert size={18} />
				{:else}
					<Info size={18} />
				{/if}
			</span>
			<p>{item.message}</p>
			{#if item.action}
				<a class="action" href={item.action.href}>{item.action.label}</a>
			{/if}
			<button type="button" class="close" onclick={() => toast.dismiss(item.id)} aria-label="Fermer">
				<X size={14} />
			</button>
		</div>
	{/each}
</div>

<style>
	.toaster {
		position: fixed;
		right: 1rem;
		bottom: 1rem;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: min(380px, calc(100vw - 2rem));
		pointer-events: none;
	}

	.toast {
		pointer-events: auto;
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		padding: 0.75rem 0.8rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
		font-size: 0.875rem;
	}

	.toast p {
		flex: 1;
		line-height: 1.45;
		padding-top: 0.05rem;
	}

	.icon {
		display: flex;
		margin-top: 0.05rem;
	}

	.toast-success .icon {
		color: var(--success);
	}

	.toast-error .icon {
		color: var(--danger);
	}

	.toast-info .icon {
		color: var(--accent);
	}

	.action {
		font-weight: 600;
		color: var(--accent);
		white-space: nowrap;
		padding-top: 0.05rem;
	}

	.close {
		display: flex;
		padding: 0.2rem;
		border-radius: 4px;
		color: var(--text-3);
	}

	.close:hover {
		background: var(--surface-2);
		color: var(--text);
	}
</style>
