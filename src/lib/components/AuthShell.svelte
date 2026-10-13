<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ArrowLeft } from '@lucide/svelte';
	import Logo from './Logo.svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	let { siteTitle, children }: { siteTitle: string; children: Snippet } = $props();
</script>

<div class="auth">
	<header class="auth-top">
		<a href="/" class="back"><ArrowLeft size={16} /> {siteTitle}</a>
		<ThemeToggle />
	</header>
	<main class="auth-main">
		<div class="auth-card">
			<div class="logo"><Logo size={40} /></div>
			{@render children()}
		</div>
	</main>
</div>

<style>
	.auth {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background:
			radial-gradient(60% 50% at 50% 0%, var(--accent-soft) 0%, transparent 70%),
			var(--bg);
	}

	.auth-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.25rem;
	}

	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.875rem;
		color: var(--text-2);
	}

	.back:hover {
		color: var(--text);
	}

	.auth-main {
		flex: 1;
		display: grid;
		place-items: center;
		padding: 1rem 1.25rem 4rem;
	}

	.auth-card {
		width: 100%;
		max-width: 400px;
		padding: 2.25rem 2rem 2rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-md);
	}

	.logo {
		display: flex;
		justify-content: center;
		margin-bottom: 1.25rem;
	}

	@media (max-width: 480px) {
		.auth-card {
			padding: 1.75rem 1.25rem 1.5rem;
		}
	}
</style>
