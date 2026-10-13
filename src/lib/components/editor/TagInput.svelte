<script lang="ts">
	import { X } from '@lucide/svelte';

	let {
		tags = $bindable(),
		suggestions = [],
		id
	}: { tags: string[]; suggestions?: string[]; id?: string } = $props();

	let draft = $state('');
	const listId = `tag-suggestions-${Math.random().toString(36).slice(2, 8)}`;
	const available = $derived(suggestions.filter((s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase())));

	function commit() {
		const parts = draft
			.split(',')
			.map((p) => p.trim().replace(/^#/, ''))
			.filter(Boolean);
		for (const part of parts) {
			if (!tags.some((t) => t.toLowerCase() === part.toLowerCase()) && tags.length < 12) {
				tags = [...tags, part.slice(0, 40)];
			}
		}
		draft = '';
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			commit();
		} else if (e.key === 'Backspace' && !draft && tags.length) {
			tags = tags.slice(0, -1);
		}
	}
</script>

<div class="tag-input">
	{#each tags as tag}
		<span class="tag">
			{tag}
			<button type="button" onclick={() => (tags = tags.filter((t) => t !== tag))} aria-label="Retirer {tag}">
				<X size={12} />
			</button>
		</span>
	{/each}
	<input
		{id}
		bind:value={draft}
		{onkeydown}
		onblur={commit}
		oninput={() => draft.includes(',') && commit()}
		list={listId}
		placeholder={tags.length ? '' : 'Ajouter un tag…'}
		autocomplete="off"
	/>
	<datalist id={listId}>
		{#each available as suggestion}<option value={suggestion}></option>{/each}
	</datalist>
</div>

<style>
	.tag-input {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		align-items: center;
		min-height: 2.5rem;
		padding: 0.35rem 0.5rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		background: var(--surface);
		cursor: text;
	}

	.tag-input:focus-within {
		border-color: var(--accent);
		box-shadow: var(--ring);
	}

	.tag {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		height: 1.6rem;
		padding: 0 0.3rem 0 0.6rem;
		border-radius: 999px;
		background: var(--accent-soft);
		color: var(--accent);
		font-size: 0.8rem;
		font-weight: 550;
	}

	.tag button {
		display: grid;
		place-items: center;
		width: 1.15rem;
		height: 1.15rem;
		border-radius: 50%;
		color: inherit;
	}

	.tag button:hover {
		background: var(--accent-soft-2);
	}

	input {
		flex: 1;
		min-width: 7rem;
		border: none;
		outline: none;
		background: none;
		font-size: 0.875rem;
		padding: 0.2rem;
	}
</style>
