<script lang="ts">
	import { enhance } from '$app/forms';
	import { CircleAlert, LoaderCircle } from '@lucide/svelte';
	import AuthShell from '$lib/components/AuthShell.svelte';
	import PasswordInput from '$lib/components/PasswordInput.svelte';

	let { data, form } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Connexion — {data.siteTitle}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<AuthShell siteTitle={data.siteTitle}>
	<div class="heading">
		<h1>Bon retour</h1>
		<p>Connectez-vous pour écrire et gérer vos articles.</p>
	</div>

	{#if form?.error}
		<div class="alert alert-danger" role="alert"><CircleAlert size={16} /> {form.error}</div>
	{/if}

	<form
		method="post"
		class="form"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				await update({ reset: false });
				loading = false;
			};
		}}
	>
		<label class="field">
			<span class="field-label">Nom d'utilisateur ou email</span>
			<!-- svelte-ignore a11y_autofocus -->
			<input class="input" name="identifier" value={form?.identifier ?? ''} required autocomplete="username" autofocus />
		</label>

		<label class="field">
			<span class="field-label">Mot de passe</span>
			<PasswordInput name="password" required autocomplete="current-password" />
		</label>

		<button type="submit" class="btn btn-primary btn-lg btn-block" disabled={loading}>
			{#if loading}<LoaderCircle size={16} class="spinner" />{/if}
			Se connecter
		</button>
	</form>
</AuthShell>

<style>
	.heading {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	h1 {
		font-family: var(--font-serif);
		font-size: 1.75rem;
		font-weight: 550;
	}

	.heading p {
		margin-top: 0.35rem;
		color: var(--text-2);
		font-size: 0.9rem;
	}

	.alert {
		margin-bottom: 1rem;
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form .btn {
		margin-top: 0.4rem;
	}
</style>
