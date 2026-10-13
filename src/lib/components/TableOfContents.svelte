<script lang="ts">
	import type { TocEntry } from '$lib/typst/engine';

	let {
		items,
		active = -1,
		onselect
	}: { items: TocEntry[]; active?: number; onselect: (item: TocEntry) => void } = $props();

	const minLevel = $derived(Math.min(...items.map((i) => i.level)));
</script>

<ol class="toc">
	{#each items as item, i}
		<li style:--depth={item.level - minLevel}>
			<a
				href="#section-{i}"
				class:active={i === active}
				aria-current={i === active ? 'location' : undefined}
				onclick={(e) => {
					e.preventDefault();
					onselect(item);
				}}
			>
				{item.text}
			</a>
		</li>
	{/each}
</ol>

<style>
	.toc {
		list-style: none;
		border-left: 1px solid var(--border);
	}

	a {
		display: block;
		margin-left: -1px;
		padding: 0.3rem 0 0.3rem calc(0.85rem + var(--depth) * 0.8rem);
		border-left: 2px solid transparent;
		font-size: 0.8125rem;
		line-height: 1.4;
		color: var(--text-3);
		transition:
			color 0.15s var(--ease),
			border-color 0.15s var(--ease);
	}

	a:hover {
		color: var(--text);
	}

	a.active {
		color: var(--accent);
		border-left-color: var(--accent);
		font-weight: 550;
	}
</style>
