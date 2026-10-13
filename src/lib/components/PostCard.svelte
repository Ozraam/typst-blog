<script lang="ts">
	import type { Post } from '$lib/server/posts';
	import TagBadge from './TagBadge.svelte';

	let { post } = $props<{ post: Post }>();

	function formatDate(timestamp: number | null): string {
		if (!timestamp) return 'Non daté';
		return new Intl.DateTimeFormat('fr-FR', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		}).format(new Date(timestamp));
	}
</script>

<article class="post-card">
	<div class="meta">
		<time datetime={post.published_at ? new Date(post.published_at).toISOString() : ''}>
			{formatDate(post.published_at || post.created_at)}
		</time>
		{#if post.author_name}
			<span class="author">· par {post.author_name}</span>
		{/if}
	</div>

	<h2 class="title">
		<a href="/posts/{post.slug}">{post.title}</a>
	</h2>

	{#if post.excerpt}
		<p class="excerpt">{post.excerpt}</p>
	{/if}

	{#if post.tags && post.tags.length > 0}
		<div class="tags">
			{#each post.tags as tag}
				<TagBadge {tag} />
			{/each}
		</div>
	{/if}
</article>

<style>
	.post-card {
		padding: 1.5rem;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		transition: transform 0.15s ease, box-shadow 0.15s ease;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.post-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
		border-color: var(--accent);
	}

	.meta {
		font-size: 0.85rem;
		color: var(--text-muted);
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.title {
		font-size: 1.35rem;
		line-height: 1.3;
		font-weight: 700;
	}

	.title a {
		color: var(--text-primary);
	}

	.title a:hover {
		color: var(--accent);
	}

	.excerpt {
		color: var(--text-secondary);
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.25rem;
	}
</style>
