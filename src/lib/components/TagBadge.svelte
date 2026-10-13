<script lang="ts">
	let { tag, active = false, count = undefined } = $props<{
		tag: string;
		active?: boolean;
		count?: number;
	}>();
</script>

<a
	href="/?tag={encodeURIComponent(tag)}"
	class="tag-badge {active ? 'active' : ''}"
>
	#{tag}
	{#if count !== undefined}
		<span class="count">{count}</span>
	{/if}
</a>

<style>
	.tag-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.2rem 0.6rem;
		border-radius: 9999px;
		font-size: 0.8rem;
		font-weight: 500;
		background: var(--bg-secondary);
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
		transition: all 0.15s ease;
		text-decoration: none;
	}

	.tag-badge:hover,
	.tag-badge.active {
		background: var(--accent);
		color: var(--accent-contrast);
		border-color: var(--accent);
	}

	.count {
		font-size: 0.7rem;
		opacity: 0.8;
	}
</style>
