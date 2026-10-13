<script lang="ts">
	import { page } from '$app/state';
	import { ArrowLeft } from '@lucide/svelte';

	const notFound = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{notFound ? 'Page introuvable' : 'Erreur'}</title>
</svelte:head>

<div class="container error-page">
	<p class="code">{page.status}</p>
	<h1>{notFound ? 'Cette page n’existe pas' : 'Quelque chose s’est mal passé'}</h1>
	<p class="message">
		{notFound
			? 'Le lien est peut-être incorrect, ou l’article a été déplacé ou retiré.'
			: (page.error?.message ?? 'Une erreur inattendue est survenue. Réessayez dans un instant.')}
	</p>
	<a href="/" class="btn btn-primary"><ArrowLeft size={16} /> Retour à l'accueil</a>
</div>

<style>
	.error-page {
		max-width: 640px;
		padding-block: clamp(4rem, 14vh, 9rem);
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.code {
		font-family: var(--font-serif);
		font-size: 5.5rem;
		line-height: 1;
		font-weight: 500;
		color: var(--accent);
		letter-spacing: -0.04em;
	}

	h1 {
		margin-top: 1rem;
		font-family: var(--font-serif);
		font-size: 2rem;
		font-weight: 550;
	}

	.message {
		margin: 0.75rem 0 2rem;
		color: var(--text-2);
	}
</style>
