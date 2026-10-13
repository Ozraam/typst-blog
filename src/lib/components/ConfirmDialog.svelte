<script lang="ts">
	import { TriangleAlert } from '@lucide/svelte';
	import { confirmDialog } from '$lib/ui/confirm.svelte';
	import Modal from './Modal.svelte';

	const request = $derived(confirmDialog.request);
</script>

<Modal open={!!request} onclose={() => confirmDialog.close(false)} size="sm" labelledby="confirm-title">
	{#if request}
		<div class="confirm">
			{#if request.danger}
				<div class="icon"><TriangleAlert size={20} /></div>
			{/if}
			<div class="text">
				<h2 id="confirm-title">{request.title}</h2>
				{#if request.message}<p>{request.message}</p>{/if}
			</div>
		</div>
		<div class="actions">
			<button type="button" class="btn btn-secondary" onclick={() => confirmDialog.close(false)}>
				{request.cancelLabel ?? 'Annuler'}
			</button>
			<!-- svelte-ignore a11y_autofocus -->
			<button
				type="button"
				class="btn {request.danger ? 'btn-danger' : 'btn-primary'}"
				onclick={() => confirmDialog.close(true)}
				autofocus
			>
				{request.confirmLabel ?? 'Confirmer'}
			</button>
		</div>
	{/if}
</Modal>

<style>
	.confirm {
		display: flex;
		gap: 0.9rem;
		padding: 1.4rem 1.4rem 0.4rem;
	}

	.icon {
		flex-shrink: 0;
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		background: var(--danger-soft);
		color: var(--danger);
	}

	h2 {
		font-size: 1.05rem;
		margin-bottom: 0.35rem;
	}

	p {
		color: var(--text-2);
		font-size: 0.9rem;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		padding: 1.1rem 1.4rem 1.3rem;
	}
</style>
