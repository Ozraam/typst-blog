<script lang="ts">
	import { ArrowUpRight } from '@lucide/svelte';
	import { formatDate, isoDate } from '$lib/format';

	interface CardPost {
		title: string;
		slug: string;
		summary: string;
		published_at: number | null;
		created_at: number;
		word_count: number | null;
		author_name?: string;
		tags: string[];
	}

	let { post, featured = false }: { post: CardPost; featured?: boolean } = $props();

	const minutes = $derived(post.word_count ? Math.max(1, Math.round(post.word_count / 220)) : null);
</script>

<article class="post" class:featured>
	<div class="meta">
		<time datetime={isoDate(post.published_at ?? post.created_at)}>{formatDate(post.published_at ?? post.created_at)}</time>
		{#if minutes}<span aria-hidden="true">·</span><span>{minutes} min de lecture</span>{/if}
	</div>

	<h2 class="title">
		<a href="/posts/{post.slug}">
			{post.title}
			{#if featured}<ArrowUpRight size={22} class="arrow" />{/if}
		</a>
	</h2>

	{#if post.summary}
		<p class="summary">{post.summary}</p>
	{/if}

	{#if post.tags.length}
		<ul class="tags" aria-label="Tags">
			{#each post.tags as tag}
				<li><a href="/?tag={encodeURIComponent(tag)}">#{tag}</a></li>
			{/each}
		</ul>
	{/if}
</article>

<style>
	.post {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		padding-block: 1.9rem;
		border-top: 1px solid var(--border);
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		font-size: 0.8125rem;
		color: var(--text-3);
	}

	.title {
		font-family: var(--font-serif);
		font-size: 1.6rem;
		font-weight: 600;
		line-height: 1.2;
		letter-spacing: -0.01em;
		text-wrap: balance;
	}

	.title a {
		background-image: linear-gradient(var(--accent), var(--accent));
		background-size: 0 1.5px;
		background-position: 0 100%;
		background-repeat: no-repeat;
		transition:
			background-size 0.3s var(--ease),
			color 0.15s var(--ease);
	}

	.title a:hover {
		color: var(--accent);
		background-size: 100% 1.5px;
	}

	/* The whole card is clickable */
	.title a::after {
		content: '';
		position: absolute;
		inset: 0;
	}

	.summary {
		color: var(--text-2);
		font-size: 0.975rem;
		line-height: 1.65;
		max-width: 46rem;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.tags {
		position: relative;
		z-index: 1;
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.75rem;
		list-style: none;
		margin-top: 0.2rem;
		font-size: 0.8125rem;
	}

	.tags a {
		color: var(--text-3);
		font-weight: 500;
	}

	.tags a:hover {
		color: var(--accent);
	}

	.featured {
		padding: 2rem;
		margin-bottom: 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-xl);
		background:
			radial-gradient(120% 140% at 100% 0%, var(--accent-soft) 0%, transparent 55%),
			var(--surface);
		box-shadow: var(--shadow-sm);
		transition:
			box-shadow 0.2s var(--ease),
			border-color 0.2s var(--ease);
	}

	.featured:hover {
		box-shadow: var(--shadow-md);
		border-color: var(--border-strong);
	}

	.featured .title {
		font-size: clamp(1.8rem, 4vw, 2.4rem);
	}

	.featured .title a {
		background: none;
	}

	.featured :global(.arrow) {
		display: inline;
		vertical-align: middle;
		color: var(--text-3);
		transition: transform 0.2s var(--ease);
	}

	.featured:hover :global(.arrow) {
		transform: translate(2px, -2px);
		color: var(--accent);
	}

	.featured .summary {
		font-size: 1.05rem;
	}

	@media (max-width: 640px) {
		.featured {
			padding: 1.4rem;
		}
	}
</style>
