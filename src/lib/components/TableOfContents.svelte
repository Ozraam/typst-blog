<script lang="ts">
	import type { TocItem } from '$lib/server/toc';

	let { items = [] } = $props<{ items: TocItem[] }>();

	function scrollToHeading(id: string, e: MouseEvent) {
		e.preventDefault();
		// Try to find element or SVG text matching anchor
		const target = document.getElementById(id);
		if (target) {
			target.scrollIntoView({ behavior: 'smooth' });
			return;
		}

		// Fallback: search for text or heading in rendered Typst
		const headingTexts = document.querySelectorAll('.typst-content h1, .typst-content h2, .typst-content h3, .typst-content text');
		for (const el of headingTexts) {
			const item = items.find((i: TocItem) => i.id === id);
			if (item && el.textContent?.trim().toLowerCase().includes(item.text.toLowerCase())) {
				el.scrollIntoView({ behavior: 'smooth' });
				break;
			}
		}
	}
</script>

{#if items.length > 0}
	<nav class="toc" aria-label="Table des matières">
		<h3 class="toc-title">Table des matières</h3>
		<ul class="toc-list">
			{#each items as item}
				<li class="toc-item level-{item.level}">
					<a href="#{item.id}" onclick={(e) => scrollToHeading(item.id, e)}>
						{item.text}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
{/if}

<style>
	.toc {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1.25rem;
		max-height: calc(100vh - 8rem);
		overflow-y: auto;
		position: sticky;
		top: 2rem;
	}

	.toc-title {
		font-size: 0.95rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		margin-bottom: 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border-light);
	}

	.toc-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.toc-item a {
		font-size: 0.85rem;
		color: var(--text-secondary);
		display: block;
		line-height: 1.4;
		transition: color 0.15s ease;
	}

	.toc-item a:hover {
		color: var(--accent);
	}

	.level-1 {
		font-weight: 600;
		margin-top: 0.25rem;
	}

	.level-2 {
		padding-left: 0.75rem;
		border-left: 2px solid var(--border-light);
	}

	.level-3 {
		padding-left: 1.5rem;
		border-left: 2px solid var(--border-light);
		font-size: 0.8rem;
		color: var(--text-muted);
	}
</style>
