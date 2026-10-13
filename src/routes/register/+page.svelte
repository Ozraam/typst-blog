<script lang="ts">
	import { enhance } from '$app/forms';
	import { CircleAlert, LoaderCircle, Lock } from '@lucide/svelte';
	import AuthShell from '$lib/components/AuthShell.svelte';
	import PasswordInput from '$lib/components/PasswordInput.svelte';

	let { data, form } = $props();
	let loading = $state(false);
	const open = $derived(data.isFirstRun || data.allowRegistration);
</script>

<svelte:head>
	<title>{data.isFirstRun ? 'Configuration' : 'Créer un compte'} — {data.siteTitle}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<AuthShell siteTitle={data.siteTitle}>
	<div class="heading">
		{#if data.isFirstRun}
			<span class="badge badge-accent badge-plain">Première installation</span>
			<h1>Créez votre blog</h1>
			<p>Ce premier compte en sera l'administrateur. Vous pourrez inviter d'autres auteurs ensuite.</p>
		{:else}
			<h1>Rejoindre la rédaction</h1>
			<p>Créez un compte auteur pour publier vos articles en Typst.</p>
		{/if}
	</div>

	{#if form?.error}
		<div class="alert alert-danger" role="alert"><CircleAlert size={16} /> {form.error}</div>
	{/if}

	{#if open}
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
				<span class="field-label">Nom d'utilisateur</span>
				<!-- svelte-ignore a11y_autofocus -->
				<input class="input" name="username" value={form?.username ?? ''} required minlength="3" maxlength="32" autocomplete="username" autofocus />
			</label>

			<label class="field">
				<span class="field-label">Adresse email</span>
				<input class="input" type="email" name="email" value={form?.email ?? ''} required autocomplete="email" />
			</label>

			<label class="field">
				<span class="field-label">Mot de passe</span>
				<PasswordInput name="password" required minlength={8} autocomplete="new-password" />
				<span class="field-hint">8 caractères minimum.</span>
			</label>

			<label class="field">
				<span class="field-label">Confirmation</span>
				<PasswordInput name="confirmPassword" required minlength={8} autocomplete="new-password" />
			</label>

			<button type="submit" class="btn btn-primary btn-lg btn-block" disabled={loading}>
				{#if loading}<LoaderCircle size={16} class="spinner" />{/if}
				{data.isFirstRun ? 'Créer le compte administrateur' : 'Créer mon compte'}
			</button>
		</form>
	{:else}
		<div class="closed">
			<Lock size={20} />
			<p>Les inscriptions sont fermées. Contactez l'administrateur du blog pour obtenir un accès.</p>
		</div>
	{/if}

	{#if !data.isFirstRun}
		<p class="footer">Déjà un compte ? <a href="/login">Se connecter</a></p>
	{/if}
</AuthShell>

<style>
	.heading {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	.heading .badge {
		margin-bottom: 0.75rem;
	}

	h1 {
		font-family: var(--font-serif);
		font-size: 1.75rem;
		font-weight: 550;
	}

	.heading p {
		margin-top: 0.4rem;
		color: var(--text-2);
		font-size: 0.9rem;
		text-wrap: pretty;
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

	.closed {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		padding: 1.25rem;
		border-radius: var(--radius-md);
		background: var(--surface-2);
		color: var(--text-2);
		font-size: 0.9rem;
		text-align: center;
	}

	.footer {
		margin-top: 1.5rem;
		text-align: center;
		font-size: 0.875rem;
		color: var(--text-2);
	}

	.footer a {
		color: var(--accent);
		font-weight: 600;
	}
</style>
